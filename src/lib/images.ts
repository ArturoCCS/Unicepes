import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import path from 'node:path';

type Loader = () => Promise<{ default: ImageMetadata }>;

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{webp,avif,png,jpg,jpeg,gif,tif,tiff,svg}',
);

const FORMAT_RANK: Record<string, number> = { webp: 0, avif: 1, png: 2, jpg: 3, jpeg: 4, gif: 5, tif: 6, tiff: 7 };

interface Entry {
  key: string;
  dir: string;
  name: string;
  globPath: string;
  load: Loader;
}

const index = new Map<string, Entry>();
for (const [globPath, load] of Object.entries(modules)) {
  const rel = globPath.replace('/src/assets/', '');
  const ext = path.extname(rel);
  const key = rel.slice(0, -ext.length);
  const prev = index.get(key);
  const rank = (p: string) => FORMAT_RANK[path.extname(p).slice(1).toLowerCase()] ?? 99;
  if (prev && rank(prev.globPath) <= rank(globPath)) continue;
  index.set(key, { key, dir: path.posix.dirname(key), name: path.posix.basename(key), globPath, load });
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export interface LoadedImage {
  key: string;
  name: string;
  meta: ImageMetadata;
}

export const hasImage = (key: string) => index.has(normalize(key));

export async function loadImage(key: string): Promise<ImageMetadata | undefined> {
  const entry = index.get(normalize(key));
  return entry ? (await entry.load()).default : undefined;
}

export async function loadFolder(dir: string): Promise<LoadedImage[]> {
  const d = normalize(dir);
  const entries = [...index.values()].filter((e) => e.dir === d).sort((a, b) => natural(a.name, b.name));
  return Promise.all(entries.map(async (e) => ({ key: e.key, name: e.name, meta: (await e.load()).default })));
}

export function listSubfolders(dir: string): string[] {
  const d = normalize(dir);
  const out = new Set<string>();
  for (const e of index.values()) {
    if (e.dir.startsWith(d + '/')) out.add(e.dir.slice(d.length + 1).split('/')[0]);
  }
  return [...out].sort(natural);
}

const normalize = (key: string) => key.replace(/^\/+|\/+$/g, '').replace(/\.[a-z0-9]+$/i, '');

export const DEFAULT_FORMATS = (process.env.IMAGE_FORMATS ?? 'avif,webp')
  .split(',')
  .map((f) => f.trim())
  .filter((f): f is 'avif' | 'webp' => f === 'avif' || f === 'webp');

export const WIDTHS = { thumb: 480, md: 1100, full: 2000 } as const;
export const QUALITY = 80;

export interface ImageSet {
  thumb: string;
  md: string;
  full: string;
  width: number;
  height: number;
  color?: string;
}

export async function imageSet(meta: ImageMetadata, key?: string): Promise<ImageSet> {
  const make = async (w: number) => {
    const width = Math.min(w, meta.width);
    const img = await getImage({ src: meta, width, format: 'webp', quality: QUALITY });
    return img.src;
  };
  const [thumb, md, full] = await Promise.all([make(WIDTHS.thumb), make(WIDTHS.md), make(WIDTHS.full)]);
  return { thumb, md, full, width: meta.width, height: meta.height, color: key ? await dominantColor(key) : undefined };
}

const colorCache = new Map<string, string | undefined>();

export async function dominantColor(key: string): Promise<string | undefined> {
  const k = normalize(key);
  if (colorCache.has(k)) return colorCache.get(k);
  let color: string | undefined;
  try {
    const entry = index.get(k);
    if (entry) {
      const { default: sharp } = await import('sharp');
      const file = path.join(process.cwd(), entry.globPath);
      const meta = await sharp(file).metadata();
      if (!meta.hasAlpha) {
        const { data } = await sharp(file).resize(1, 1, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        color = '#' + [...data.subarray(0, 3)].map((n) => n.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch {
    color = undefined;
  }
  colorCache.set(k, color);
  return color;
}
