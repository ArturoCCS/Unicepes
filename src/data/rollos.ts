export interface Rollo {
  id: string;
  nombre: string;
  texto: string;
  iso: number;
  color: string;
  textoColor: string;
  matiz: number;
  fotos: string[];
}


const images = import.meta.glob<{ default: ImageMetadata }>(
    "/src/assets/fotografia/**/*.{png,jpg,jpeg,webp}",
    { eager: true }
);

const getRolloPhotos = (folder: string): string[] => {
    return Object.entries(images)
        .filter(([path]) => path.includes(`/fotografia/${folder}/`))
        .map(([_, module]) => module.default.src);
};

export const rollos = [
  { 
    id: 'retratos', 
    nombre: 'Retratos', 
    texto: '', 
    iso: 200, 
    color: '#e8a93a', 
    textoColor: '#151515', 
    matiz: 24, 
    fotos: getRolloPhotos('retratos')
  },
  { 
    id: 'productos', 
    nombre: 'Productos', 
    texto: '', 
    iso: 200, 
    color: '#2f9e6b', 
    textoColor: '#ffffff', 
    matiz: 150, 
    fotos: getRolloPhotos('productos') 
  },
  { 
    id: 'naturaleza', 
    nombre: 'Naturaleza', 
    texto: '', 
    iso: 400, 
    color: '#e5483b', 
    textoColor: '#ffffff', 
    matiz: 215, 
    fotos: getRolloPhotos('naturaleza') 
  },
];
export const cantidad = (r: Rollo) => r.fotos.length || 8;

export function fondo(r: Rollo, i: number) {
  const src = r.fotos[i];
  if (src) return `url('${src}')`;
  const h = r.matiz;
  return `radial-gradient(circle at ${18 + i * 10}% ${30 + (i % 3) * 12}%,hsl(${h + 10} 70% 88%) 0 7%,transparent 7.5%),linear-gradient(${140 + i * 23}deg,hsl(${h + i * 6} 42% ${76 - (i % 3) * 7}%),hsl(${h + 34 + i * 6} 36% ${44 + (i % 4) * 5}%))`;
}