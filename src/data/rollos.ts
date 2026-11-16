import type { ImageMetadata } from 'astro';
import { imageSet, loadFolder, type ImageSet } from '../lib/images';

export interface Foto {
  meta: ImageMetadata;
  set: ImageSet;
  alt: string;
}

export interface Rollo {
  id: string;
  nombre: string;
  texto: string;
  descripcion: string;
  iso: number;
  color: string;
  textoColor: string;
  matiz: number;
  fotos: Foto[];
}

const definiciones = [
  { id: 'retratos', nombre: 'Retratos', texto: '', iso: 200, color: '#e8a93a', textoColor: '#151515', matiz: 24 },
  { id: 'productos', nombre: 'Productos', texto: '', iso: 200, color: '#2f9e6b', textoColor: '#ffffff', matiz: 150 },
  { id: 'naturaleza', nombre: 'Naturaleza', texto: '', iso: 400, color: '#e5483b', textoColor: '#ffffff', matiz: 215 },
];

let cache: Promise<Rollo[]> | undefined;

export function getRollos(): Promise<Rollo[]> {
  cache ??= Promise.all(
    definiciones.map(async (d): Promise<Rollo> => {
      const archivos = await loadFolder(`fotografia/${d.id}`);
      const fotos = await Promise.all(
        archivos.map(async (f, i) => ({
          meta: f.meta,
          set: await imageSet(f.meta, f.key),
          alt: `${d.nombre}: fotografía ${i + 1}`,
        })),
      );
      return {
        ...d,
        descripcion: `Rollo de fotografía analógica «${d.nombre}»: ${fotos.length || 'varias'} fotografías del área de diseño de UNICEPES.`,
        fotos,
      };
    }),
  );
  return cache;
}

export const cantidad = (r: Rollo) => r.fotos.length || 8;

export function fondo(r: Rollo, i: number) {
  const h = r.matiz;
  return `radial-gradient(circle at ${18 + i * 10}% ${30 + (i % 3) * 12}%,hsl(${h + 10} 70% 88%) 0 7%,transparent 7.5%),linear-gradient(${140 + i * 23}deg,hsl(${h + i * 6} 42% ${76 - (i % 3) * 7}%),hsl(${h + 34 + i * 6} 36% ${44 + (i % 4) * 5}%))`;
}
