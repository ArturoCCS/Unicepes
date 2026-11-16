#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { watch } from 'node:fs';
import { mkdir, readdir, readFile, rename, stat, copyFile, unlink, writeFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = process.cwd();

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const CFG = {
  dir: path.resolve(ROOT, opt('dir', 'src/assets')),
  backupDir: path.resolve(ROOT, opt('backup', 'originals')),
  max: Number(opt('max', 2560)),
  quality: Number(opt('quality', 85)),
  qualityGraphic: Number(opt('quality-graphic', 90)),
  keep: flag('keep'),
  dry: flag('dry-run'),
  force: flag('force'),
  quiet: flag('quiet'),
  watch: flag('watch'),
};

const CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);
const WEBP = '.webp';
const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', 'dist']);

const log = (...a) => !CFG.quiet && console.log(...a);
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const size = (n) => (n >= 1024 * 1024 ? mb(n) : kb(n));
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const exists = (p) => stat(p).then(() => true, () => false);

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      yield path.join(dir, e.name);
    }
  }
}

async function hashFile(file) {
  return createHash('sha1').update(await readFile(file)).digest('hex');
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

function webpOptions(ext) {
  const isGraphic = ext === '.png' || ext === '.tif' || ext === '.tiff';
  return {
    quality: isGraphic ? CFG.qualityGraphic : CFG.quality,
    alphaQuality: 100,
    smartSubsample: true,
    effort: 5,
  };
}

async function convert(file) {
  const ext = path.extname(file).toLowerCase();
  const target = file.slice(0, -ext.length) + WEBP;
  const before = (await stat(file)).size;

  const img = sharp(file, { failOn: 'none', limitInputPixels: false });
  const meta = await img.metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);

  if (!CFG.force && (await exists(target))) {
    return { file, status: 'conflict', note: `ya existe ${path.basename(target)}`, before };
  }

  const pipeline = img
    .rotate()
    .resize({
      width: CFG.max,
      height: CFG.max,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toColorspace('srgb')
    .webp(webpOptions(ext));

  const buf = await pipeline.toBuffer();

  if (buf.length >= before && longEdge <= CFG.max) {
    return { file, status: 'kept', note: 'WebP no sería más pequeño', before };
  }

  const out = await sharp(buf).metadata();
  if (CFG.dry) {
    return { file, target, status: 'dry', before, after: buf.length, dims: `${meta.width}×${meta.height} → ${out.width}×${out.height}` };
  }

  await writeFile(target, buf);

  if (!CFG.keep) {
    const backup = path.join(CFG.backupDir, path.relative(CFG.dir, file));
    await mkdir(path.dirname(backup), { recursive: true });
    await moveFile(file, backup);
  }

  return { file, target, status: 'converted', before, after: buf.length, dims: `${meta.width}×${meta.height} → ${out.width}×${out.height}` };
}

async function shrinkWebp(file) {
  const before = (await stat(file)).size;
  const img = sharp(file, { failOn: 'none', limitInputPixels: false });
  const meta = await img.metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  if (longEdge <= CFG.max) return null;

  const buf = await img
    .resize({ width: CFG.max, height: CFG.max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: CFG.quality, alphaQuality: 100, smartSubsample: true, effort: 5 })
    .toBuffer();
  const out = await sharp(buf).metadata();
  if (CFG.dry) return { file, status: 'dry', before, after: buf.length, dims: `${meta.width}×${meta.height} → ${out.width}×${out.height}` };

  if (!CFG.keep) {
    const backup = path.join(CFG.backupDir, path.relative(CFG.dir, file));
    await mkdir(path.dirname(backup), { recursive: true });
    await copyFile(file, backup);
  }
  await writeFile(file, buf);
  return { file, status: 'converted', before, after: buf.length, dims: `${meta.width}×${meta.height} → ${out.width}×${out.height}` };
}

async function moveFile(from, to) {
  try {
    await rename(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await copyFile(from, to);
    await unlink(from);
  }
}

async function collect() {
  const convertible = [];
  const webps = [];
  for await (const file of walk(CFG.dir)) {
    const ext = path.extname(file).toLowerCase();
    if (CONVERTIBLE.has(ext)) convertible.push(file);
    else if (ext === WEBP) webps.push(file);
  }
  return { convertible, webps };
}

async function run() {
  if (!(await exists(CFG.dir))) {
    console.error(`✖ No existe la carpeta ${rel(CFG.dir)}`);
    process.exit(1);
  }

  const { convertible, webps } = await collect();
  const oversizedWebps = [];
  for (const w of webps) {
    const m = await sharp(w, { failOn: 'none' }).metadata().catch(() => null);
    if (m && Math.max(m.width ?? 0, m.height ?? 0) > CFG.max) oversizedWebps.push(w);
  }

  if (!convertible.length && !oversizedWebps.length) {
    log(`✓ Imágenes al día (${webps.length} WebP en ${rel(CFG.dir)}). Nada que convertir.`);
    return { converted: 0 };
  }

  const hashes = new Map();
  for (const f of convertible) {
    const h = await hashFile(f);
    hashes.set(h, [...(hashes.get(h) ?? []), f]);
  }

  const jobs = [
    ...convertible.map((f) => () => convert(f)),
    ...oversizedWebps.map((f) => () => shrinkWebp(f)),
  ];
  const results = (
    await pool(jobs, Math.max(1, Math.min(4, availableParallelism() - 1)), async (job) => {
      try {
        return await job();
      } catch (err) {
        return { status: 'error', note: err.message };
      }
    })
  ).filter(Boolean);

  if (results.every((r) => r.status === 'kept')) {
    log(`✓ Imágenes al día (${webps.length + results.length} en ${rel(CFG.dir)}). Nada que convertir.`);
    return { converted: 0 };
  }

  log(`\n${CFG.dry ? ' Simulación — ' : ''}Optimizando ${convertible.length + oversizedWebps.length} imagen(es) en ${rel(CFG.dir)}`);
  log(`   máx ${CFG.max}px · calidad foto ${CFG.quality} · calidad gráfico ${CFG.qualityGraphic}\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  for (const r of results) {
    const name = r.file ? rel(r.file) : '(desconocido)';
    if (r.status === 'converted' || r.status === 'dry') {
      totalBefore += r.before;
      totalAfter += r.after;
      const saved = Math.round((1 - r.after / r.before) * 100);
      log(`  ✓ ${name.padEnd(52)} ${size(r.before).padStart(9)} → ${size(r.after).padStart(9)}  −${String(saved).padStart(2)}%   ${r.dims}`);
    } else if (r.status === 'kept') {
      if (flag('verbose')) log(`  = ${name.padEnd(52)} se mantiene (${r.note})`);
    } else if (r.status === 'conflict') {
      console.warn(`  ⚠ ${name}: omitido, ${r.note}. Usa --force para sobrescribir.`);
    } else {
      console.error(`  ✖ ${name}: ${r.note}`);
    }
  }

  const dupes = [...hashes.values()].filter((g) => g.length > 1);
  if (dupes.length) {
    log('\n  ⚠ Archivos idénticos (ocupan espacio de más; considera reutilizar uno solo):');
    for (const g of dupes) log(`    · ${g.map(rel).join('  =  ')}`);
  }

  const converted = results.filter((r) => r.status === 'converted' || r.status === 'dry').length;
  if (converted) {
    log(`\n  ${CFG.dry ? 'Ahorro estimado' : 'Ahorro total'}: ${size(totalBefore)} → ${size(totalAfter)}  (−${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);
    if (!CFG.dry && !CFG.keep) log(`  Originales a salvo en ${rel(CFG.backupDir)}/\n`);
  }
  return { converted };
}

async function watchMode() {
  log(`Vigilando ${rel(CFG.dir)} … (Ctrl+C para salir)\n`);
  let timer;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await run();
      } catch (e) {
        console.error(e);
      }
    }, 1200);
  };
  watch(CFG.dir, { recursive: true }, (_evt, name) => {
    if (!name) return;
    const ext = path.extname(name).toLowerCase();
    if (CONVERTIBLE.has(ext)) trigger();
  });
  await run();
}

if (CFG.watch) await watchMode();
else await run();
