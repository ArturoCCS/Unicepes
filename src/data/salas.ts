import type { ImageMetadata } from 'astro';
import { imageSet, loadImage, type ImageSet } from '../lib/images';

export interface Obra {
  title: string;
  meta: string;
  image?: ImageMetadata;
  set?: ImageSet;
}

export interface ObraCliente {
  title: string;
  meta: string;
  thumb?: string;
  tex?: string;
  full?: string;
}

export interface Sala {
  slug: string;
  nombre: string;
  desc: string;
  descripcionSeo: string;
  wall: string;
  floorHue: number;
  frame: string;
  mat: number;
  fw: number;
  obras: Obra[];
}

const definiciones: Record<string, Omit<Sala, 'obras'> & { obras: [string, string][] }> = {
  dibujos: {
    slug: 'dibujos',
    nombre: 'Dibujos Digital',
    desc: '',
    descripcionSeo: 'Recorrido 3D por la sala de dibujos digitales del área de diseño de UNICEPES.',
    wall: '#f0eee8',
    floorHue: 28,
    frame: '#382c16',
    mat: 0.22,
    fw: 0.05,
    obras: [
      ['Estudio de manos', ''],
      ['Figura sentada', 'Carboncillo'],
      ['Paisaje de invierno', 'Tinta sobre papel'],
      ['Retrato a lápiz', 'Grafito sobre papel'],
      ['Árbol seco', 'Carboncillo'],
      ['Boceto de calle', 'Tinta y lavado'],
      ['Perfil', 'Grafito sobre papel'],
      ['Naturaleza muerta', 'Carboncillo'],
    ],
  },
  ilustraciones: {
    slug: 'ilustraciones',
    nombre: 'Ilustraciones',
    desc: '',
    descripcionSeo: 'Recorrido 3D por la sala de ilustraciones del área de diseño de UNICEPES.',
    wall: '#f0eee8',
    floorHue: 28,
    frame: '#382c16',
    mat: 0.04,
    fw: 0.05,
    obras: [
      ['Ciudad en calma', ''],
      ['Jardín nocturno', 'Digital'],
      ['El viajero', 'Técnica mixta'],
      ['Marea alta', 'Ilustración digital'],
      ['Cartel de verano', 'Digital'],
      ['Bosque de papel', 'Técnica mixta'],
      ['Retrato en color', 'Digital'],
      ['Estación', 'Ilustración digital'],
      ['Mercado al amanecer', 'Digital'],
      ['Isla', 'Técnica mixta'],
      ['Lluvia de verano', 'Ilustración digital'],
      ['La biblioteca', 'Digital'],
      ['Faro', 'Técnica mixta'],
    ],
  },
};

export type SalaSlug = keyof typeof definiciones;
export const salaSlugs = Object.keys(definiciones);

const cache = new Map<string, Promise<Sala>>();

export function getSala(slug: string): Promise<Sala> {
  if (!cache.has(slug)) {
    const def = definiciones[slug];
    cache.set(
      slug,
      Promise.all(
        def.obras.map(async ([title, meta], i): Promise<Obra> => {
          const key = `obras/${slug}/${String(i + 1).padStart(2, '0')}`;
          const image = await loadImage(key);
          return { title, meta, image, set: image ? await imageSet(image, key) : undefined };
        }),
      ).then((obras) => ({ ...def, obras })),
    );
  }
  return cache.get(slug)!;
}

export const getSalas = () => Promise.all(salaSlugs.map(getSala));

export function salaParaCliente(s: Sala) {
  return {
    slug: s.slug,
    nombre: s.nombre,
    wall: s.wall,
    floorHue: s.floorHue,
    frame: s.frame,
    mat: s.mat,
    fw: s.fw,
    obras: s.obras.map<ObraCliente>((o) => ({
      title: o.title,
      meta: o.meta,
      thumb: o.set?.thumb,
      tex: o.set?.md,
      full: o.set?.full,
    })),
  };
}
