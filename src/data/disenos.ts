import type { ImageMetadata } from 'astro';
import { imageSet, loadFolder, type ImageSet } from '../lib/images';

export interface Diseno {
  title: string;
  author: string;
  desc: string;
  tags: string[];
  meta: ImageMetadata;
  set: ImageSet;
  alt: string;
}

const info: Record<string, Partial<Pick<Diseno, 'title' | 'author' | 'desc' | 'tags'>>> = {
  '1': { title: 'Diseño 1', author: 'Autor 1', desc: 'Descripción 1', tags: ['Cartel', 'Branding'] },
  '2': { title: 'Diseño 2', author: 'Autor 2', desc: 'Descripción 2' },
  '3': { title: 'Diseño 3', author: 'Autor 3', desc: 'Descripción 3' },
  '4': { title: 'Diseño 4', author: 'Autor 4', desc: 'Descripción 4' },
  '5': { title: 'Diseño 5', author: 'Autor 5', desc: 'Descripción 5' },
  '6': { title: 'Diseño 6', author: 'Autor 6', desc: 'Descripción 6' },
  '7': { title: 'Diseño 7', author: 'Autor 7', desc: 'Descripción 7' },
};

let cache: Promise<Diseno[]> | undefined;

export function getDisenos(): Promise<Diseno[]> {
  cache ??= loadFolder('diseno').then((archivos) =>
    Promise.all(
      archivos.map(async (f): Promise<Diseno> => {
        const meta = info[f.name] ?? {};
        const title = meta.title ?? `Diseño ${f.name}`;
        return {
          title,
          author: meta.author ?? '',
          desc: meta.desc ?? '',
          tags: meta.tags ?? [],
          meta: f.meta,
          set: await imageSet(f.meta, f.key),
          alt: title,
        };
      }),
    ),
  );
  return cache;
}
