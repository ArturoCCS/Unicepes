const TRABAJOS = '/trabajos-creativos';

export const ROUTES = {
  home: '/',
  alumnos: '/alumnos/',
  sobre: '/sobre-la-carrera/',
  trabajos: `${TRABAJOS}/`,
  diseno: `${TRABAJOS}/diseno/`,
  marcas: `${TRABAJOS}/diseno-de-marca/`,
  fotografia: `${TRABAJOS}/fotografia/`,
  ilustracion: `${TRABAJOS}/dibujo-e-ilustracion/`,
  hipermedia: `${TRABAJOS}/hipermedia/`,
  rollo: (id: string) => `${TRABAJOS}/fotografia/${id}/`,
  sala: (slug: string) => `${TRABAJOS}/dibujo-e-ilustracion/${slug}/`,
} as const;
