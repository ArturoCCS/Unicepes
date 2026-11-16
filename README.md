# Portafolio · Área de Diseño UNICEPES

Sitio estático hecho con [Astro](https://astro.build) 7. Rápido por diseño: HTML estático, imágenes
optimizadas en AVIF/WebP, fuentes propias y JavaScript solo donde hace falta (Three.js se carga únicamente
en las salas 3D).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Convierte imágenes nuevas y levanta el servidor en `localhost:4321` |
| `pnpm build` | Convierte imágenes nuevas y genera el sitio en `dist/` |
| `pnpm preview` | Sirve `dist/` para probar el resultado final |
| `pnpm images` | Optimiza las imágenes de `src/assets` (también corre solo en dev/build) |
| `pnpm images:watch` | Vigila la carpeta: sueltas una imagen y se convierte sola |
| `pnpm images:dry` | Muestra qué haría el optimizador sin tocar nada |
| `pnpm check` | Revisa tipos y errores de Astro/TypeScript |

Antes de publicar define la URL real (canonical, Open Graph, sitemap y robots.txt dependen de ella):

```bash
SITE_URL=https://dominio.com pnpm build 
```

Build rápido sin AVIF (útil en CI sin caché): `IMAGE_FORMATS=webp pnpm build`.
La primera compilación genera todas las variantes de imagen y tarda; Astro las guarda en
`node_modules/.astro` y las siguientes son casi instantáneas.

## Estructura

```
scripts/
  optimize-images.mjs     Optimizador de imágenes (sharp) → WebP
src/
  assets/                 Imágenes fuente, organizadas por sección (ver "Imágenes")
  config/
    routes.ts             TODAS las URLs del sitio (cámbialas aquí y se actualizan en todas partes)
    site.ts               Nombre, descripción, idioma y datos de SEO globales
  data/                   Contenido: rollos, salas, diseños, categorías, alumnos
  lib/images.ts           Registro de imágenes (el corazón del sistema de imágenes)
  layouts/
    BaseLayout.astro      <html>, SEO, fuentes
    AppLayout.astro       BaseLayout + barra superior + contenido a pantalla completa
  components/
    ui/                   Reutilizables: Img, Button, Watermark, MessagePage
    seo/SEO.astro         Todo el <head> de SEO (título, OG, JSON-LD…)
    layout/Nav.astro      Barra superior
    trabajos/ alumnos/ fotografia/ galeria/    Componentes por sección
  scripts/                JavaScript de cliente (carruseles, esfera de marcas, galería 3D…)
  styles/                 tokens.css (diseño + colores claro/oscuro), base.css (reset + shell), fuentes y estilos por sección
  pages/                  Rutas (cada archivo = una URL)
```

## Modo claro y oscuro

- Todos los colores son variables de `src/styles/tokens.css`; cada una se define una sola vez con
  `light-dark(valor-claro, valor-oscuro)`. Para cambiar un color de un modo, edita solo esa línea.
- El tema se guarda en `<html data-theme="light|dark">`. Sin elección previa sigue al sistema
  (`prefers-color-scheme`); la elección del visitante se guarda en `localStorage` (clave `theme`).
- `BaseLayout` lo aplica antes del primer pintado (sin parpadeo). El botón es `components/ui/ThemeToggle.astro`
  (barra superior y portada) y la lógica está en `scripts/theme.ts`. La galería 3D y Hipermedia usan el mismo tema.
- Quedan fuera de las variables los colores que son contenido: rollos, alumnos, categorías de Hipermedia y los
  materiales de las escenas 3D.

## Imágenes: cómo funciona (y por qué no hay que tocar código)

1. **Suelta la imagen** (JPG/PNG de cualquier tamaño) en su carpeta de `src/assets/`.
2. **`pnpm dev` / `pnpm build`** la convierten a **WebP** (máx. 2560 px, calidad 85, sin pérdida visible) y
   guardan el original intacto en `originals/` (ignorado por git).
3. **El código nunca escribe extensiones.** Pide la imagen por su ruta sin extensión
   (`fotografia/retratos/01`) y el registro encuentra el `.webp`, `.jpg` o `.png` que exista.
4. **Astro genera en el build** AVIF + WebP en varios anchos, y el navegador descarga solo el que necesita
   (un móvil recibe ~150 KB donde un escritorio recibe ~1 MB).

### Dónde va cada imagen

| Carpeta | Para qué | Notas |
| --- | --- | --- |
| `assets/home/hero.*` | Fondo de la portada | Si no existe se usa una foto provisional |
| `assets/diseno/N.*` | Carrusel de **Diseño** | Aparecen solas en orden 1, 2, 10… Texto en `data/disenos.ts` |
| `assets/marcas/<marca>/` | Esfera de **Diseño de marca** | `logo.*` = nodo; el resto = mockups (termina el nombre en `-full`, `-half`, `-third` o `-tall` para fijar su tamaño) |
| `assets/fotografia/<rollo>/` | **Fotografía** | Rollos definidos en `data/rollos.ts` |
| `assets/obras/<sala>/01.*, 02.*…` | **Salas 3D** | Mismo orden que la lista de `data/salas.ts`; si falta una, se dibuja un cuadro de relleno |
| `assets/stickers/<id>.*` | Stickers de **Trabajos creativos** | PNG/WebP con fondo transparente; `<id>` está en `data/categorias.ts` |
| `assets/alumnos/<slug>.*` | Credenciales de **Alumnos** | `<slug>` está en `data/alumnos.ts` |

### Usar imágenes en una página nueva

```astro
---
import Img from '../components/ui/Img.astro';
import { loadImage } from '../lib/images';

const foto = await loadImage('fotografia/retratos/01');
---
<Img src={foto} alt="Descripción real de la foto" sizes="(min-width: 800px) 50vw, 100vw" />

```

- `sizes` le dice al navegador cuánto mide la imagen en pantalla; es lo que más ahorra bytes.
- `alt` es obligatorio (SEO y accesibilidad). Usa `alt=""` solo si es puramente decorativa.
- Para JavaScript de cliente (carruseles, galería 3D) usa `imageSet()` de `lib/images.ts`: devuelve URLs ya
  optimizadas (`thumb`, `md`, `full`) para pasarlas por `data-*` o JSON.

## Añadir cosas

- **Una página:** crea `src/pages/.../mi-pagina.astro` con `<AppLayout title=… description=…>` y agrega su URL en
  `config/routes.ts`. El título y la descripción alimentan título, Open Graph y sitemap.
- **Un diseño / foto / alumno / sticker:** suelta el archivo (tabla de arriba).
- **Un rollo:** una entrada en `data/rollos.ts` + carpeta `assets/fotografia/<id>/`.
- **Una sala 3D:** una entrada en `data/salas.ts` + carpeta `assets/obras/<slug>/`.
- **Una página en construcción:** usa `<MessagePage>` con `noindex` (ver `coming-soon.astro`).

## SEO

- Cada página define `title` y `description` únicos (120–160 caracteres) en su `AppLayout`/`BaseLayout`.
- `config/site.ts` guarda los datos globales. Cambia `public/og-default.jpg` (1200×630) por tu imagen real.
- Se generan `sitemap-index.xml` y `robots.txt` automáticamente (requiere `SITE_URL`).
- Las URLs antiguas (`/trabajos-crativos/…`, `/fotografia/…`, `/sala/…`) redirigen a las nuevas (`astro.config.mjs`).

## Reglas de rendimiento del proyecto

- Imágenes siempre con `<Img>` (o `imageSet()` para JS). Nunca `background-image` con una imagen del portafolio,
  ni `import x from '*.jpg'` + `.src` (eso sirve el original sin optimizar).
- Solo la imagen principal lleva `priority`; todo lo demás se carga de forma diferida.
- Fuentes: autoalojadas con `@fontsource` (solo subconjunto latino). Añade una fuente nueva importando su CSS
  en la página que la use, no en el layout global.
- Estilos con `:global()` cuando apunten a un `<img>` pintado por `<Img>` (los estilos con scope de Astro no
  atraviesan componentes hijos).
