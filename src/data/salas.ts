const obras = (dir: string, t: [string, string][]) =>
  t.map(([title, meta], i) => ({
    title,
    meta,
    src: `/src/assets/obras/${dir}/${String(i + 1).padStart(2, '0')}.jpg`,
  }));

export const salas = {
  dibujos: {
    slug: 'dibujos',
    nombre: 'Dibujos Digital',
    desc: '',
    wall: '#f0eee8',
    floorHue: 28,
    frame: '#382c16',
    mat: 0.22,
    fw: 0.05,
    obras: obras('dibujos', [
      ['Estudio de manos', ''],
      ['Figura sentada', 'Carboncillo'],
      ['Paisaje de invierno', 'Tinta sobre papel'],
      ['Retrato a lápiz', 'Grafito sobre papel'],
      ['Árbol seco', 'Carboncillo'],
      ['Boceto de calle', 'Tinta y lavado'],
      ['Perfil', 'Grafito sobre papel'],
      ['Naturaleza muerta', 'Carboncillo'],
    ]),
  },
  ilustraciones: {
    slug: 'ilustraciones',
    nombre: 'Ilustraciones',
    desc: '',
    wall: '#f0eee8',
    floorHue: 28,
    frame: '#382c16',
    mat: 0.04,
    fw: 0.05,
    obras: obras('ilustraciones', [
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
    ]),
  },
};

export type SalaSlug = keyof typeof salas;