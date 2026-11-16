import { ROUTES } from '../config/routes';

export interface Categoria {
  id: string;
  name: string;
  href: string;
  description: string;
  top: string;
  left: string;
  rotate: string;
  size: 'sm' | 'md' | 'lg';
}

export const categorias: Categoria[] = [
  {
    id: 'dibujo-e-ilustracion',
    name: 'Dibujo e Ilustración',
    href: ROUTES.ilustracion,
    description: 'Galería 3D de dibujos digitales e ilustraciones.',
    top: '30%',
    left: '65%',
    rotate: '8deg',
    size: 'md',
  },
  {
    id: 'diseno-de-marca',
    name: 'Diseño de Marca',
    href: ROUTES.marcas,
    description: 'Identidades visuales y sus aplicaciones.',
    top: '60%',
    left: '18%',
    rotate: '12deg',
    size: 'md',
  },
  {
    id: 'diseno',
    name: 'Diseño',
    href: ROUTES.diseno,
    description: 'Carteles y piezas de diseño gráfico.',
    top: '65%',
    left: '80%',
    rotate: '-12deg',
    size: 'md',
  },
  {
    id: 'fotografia',
    name: 'Fotografía',
    href: ROUTES.fotografia,
    description: 'Rollos de fotografía analógica: retratos, productos y naturaleza.',
    top: '75%',
    left: '50%',
    rotate: '5deg',
    size: 'md',
  },
  {
    id: 'hipermedia',
    name: 'Hipermedia',
    href: ROUTES.hipermedia,
    description: 'Proyectos de video, animación y medios interactivos.',
    top: '25%',
    left: '35%',
    rotate: '-4deg',
    size: 'md',
  },
];
