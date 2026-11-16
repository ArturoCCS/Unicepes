// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://example.com';

const NO_SITEMAP = ['/coming-soon', '/sobre-la-carrera'];

export default defineConfig({
  site,

  redirects: {
    '/trabajos-crativos': '/trabajos-creativos',
    '/trabajos-crativos/diseno': '/trabajos-creativos/diseno',
    '/trabajos-crativos/diseno-de-marca': '/trabajos-creativos/diseno-de-marca',
    '/trabajos-crativos/fotografia': '/trabajos-creativos/fotografia',
    '/trabajos-crativos/hipermedia': '/trabajos-creativos/hipermedia',
    '/trabajos-crativos/dibujo-e-ilustracion': '/trabajos-creativos/dibujo-e-ilustracion',
    '/trabajos-crativos/dibujo-e-ilustración': '/trabajos-creativos/dibujo-e-ilustracion',
    '/fotografia/[rollo]': '/trabajos-creativos/fotografia/[rollo]',
    '/sala/[sala]': '/trabajos-creativos/dibujo-e-ilustracion/[sala]',
  },

  integrations: [
    sitemap({
      filter: (page) => !NO_SITEMAP.some((p) => page.includes(p)),
    }),
  ],

  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: { limitInputPixels: false } },
  },

  build: {
    inlineStylesheets: 'auto',
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 900,
    },
  },
});
