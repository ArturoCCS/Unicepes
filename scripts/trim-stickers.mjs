import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const inputDir = path.join(process.cwd(), 'src/assets/stickers');
const DRY = process.argv.includes('--dry');
const PAD = Number(process.env.PAD ?? 0);
const ALPHA = Number(process.env.ALPHA ?? 1);
const RENDER = 2000;

const getAttr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
};
const removeAttr = (tag, name) =>
  tag.replace(new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'i'), '');
const setAttr = (tag, name, value) =>
  removeAttr(tag, name).replace(/(\s*\/?>)$/, ` ${name}="${value}"$1`);
const num = (v) => (v != null && /^\s*-?[\d.]+(px)?\s*$/i.test(v) ? parseFloat(v) : null);
const round = (n) => Math.round(n * 1000) / 1000;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function parse(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/<svg\b[^>]*>/i);
  if (!m) throw new Error('no encontré la etiqueta <svg>');
  const tag = m[0];
  const w = num(getAttr(tag, 'width'));
  const h = num(getAttr(tag, 'height'));
  let vb = getAttr(tag, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some(Number.isNaN)) {
    if (w && h) vb = [0, 0, w, h];
    else throw new Error('no tiene viewBox ni width/height numéricos');
  }
  return { src, tag, vb, w, h };
}

async function measure({ src, tag, vb }) {
  const [vx, vy, vw, vh] = vb;
  const scale = RENDER / Math.max(vw, vh);

  let t = setAttr(tag, 'viewBox', vb.join(' '));
  t = setAttr(t, 'width', vw * scale);
  t = setAttr(t, 'height', vh * scale);
  t = setAttr(t, 'preserveAspectRatio', 'none');

  const { data, info } = await sharp(Buffer.from(src.replace(tag, () => t)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX === -1) return null;

  const sx = width / vw, sy = height / vh;
  return {
    x0: Math.max(vx, vx + (minX - 1) / sx),
    y0: Math.max(vy, vy + (minY - 1) / sy),
    x1: Math.min(vx + vw, vx + (maxX + 2) / sx),
    y1: Math.min(vy + vh, vy + (maxY + 2) / sy),
  };
}

async function run() {
  if (!fs.existsSync(inputDir)) {
    console.error(`❌ La carpeta no existe: ${inputDir}`);
    return;
  }

  const files = [...walk(inputDir)].filter((f) => /\.svg$/i.test(f));
  console.log(`🔍 ${files.length} SVG encontrados${DRY ? ' (modo prueba: no se modifica nada)' : ''}\n`);

  const groups = new Map();
  for (const file of files) {
    const rel = path.relative(inputDir, file);
    try {
      const svg = parse(file);
      const box = await measure(svg);
      if (!box) {
        console.warn(`⚠️  ${rel}: no tiene contenido visible, se omite`);
        continue;
      }
      const base = path.basename(file).replace(/-hover(?=\.svg$)/i, '');
      const key = `${path.dirname(file)}/${base}|${svg.vb.join(',')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ file, rel, svg, box });
    } catch (e) {
      console.error(`❌ ${rel}: ${e.message}`);
    }
  }

  for (const group of groups.values()) {
    const u = group.reduce(
      (a, { box }) => ({
        x0: Math.min(a.x0, box.x0), y0: Math.min(a.y0, box.y0),
        x1: Math.max(a.x1, box.x1), y1: Math.max(a.y1, box.y1),
      }),
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    );

    for (const { file, rel, svg } of group) {
      const [vx, vy, vw, vh] = svg.vb;
      const nx = round(u.x0 - PAD), ny = round(u.y0 - PAD);
      const nw = round(u.x1 - u.x0 + 2 * PAD), nh = round(u.y1 - u.y0 + 2 * PAD);

      if (nw >= vw * 0.995 && nh >= vh * 0.995) {
        console.log(`⏭️  ${rel}: nada que recortar`);
        continue;
      }

      let t = setAttr(svg.tag, 'viewBox', `${nx} ${ny} ${nw} ${nh}`);
      const hasSize = getAttr(svg.tag, 'width') !== null || getAttr(svg.tag, 'height') !== null;
      if (hasSize) {
        if (svg.w && svg.h) {
          t = setAttr(t, 'width', round((svg.w * nw) / vw));
          t = setAttr(t, 'height', round((svg.h * nh) / vh));
        } else {
          t = removeAttr(removeAttr(t, 'width'), 'height');
          console.warn(`   ⚠️  ${rel}: width/height no numéricos, los quité`);
        }
      }

      const pct = (100 * (1 - (nw * nh) / (vw * vh))).toFixed(0);
      const pair = group.length > 1 ? ' [recortado junto a su par]' : '';
      console.log(`✨ ${rel}${pair}\n   viewBox ${svg.vb.join(' ')} → ${nx} ${ny} ${nw} ${nh}  (−${pct}% de área)`);

      if (!DRY) fs.writeFileSync(file, svg.src.replace(svg.tag, () => t));
    }
  }

  console.log(DRY ? '\n👀 Prueba terminada. Quita --dry para aplicar.' : '\n🚀 ¡Listo!');
}

run();
