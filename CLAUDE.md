## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)


## Project conventions (read before changing images, routes or layouts)

- **Images**: never import an image and use `.src`, never use CSS `background-image` for portfolio images, never
  hardcode a file extension. Use `loadImage('folder/name')` / `loadFolder()` / `imageSet()` from `src/lib/images.ts`
  and render with `src/components/ui/Img.astro`. `pnpm images` (runs automatically in `dev`/`build`) converts new
  JPG/PNG in `src/assets` to WebP and backs the originals up to `originals/`.
- **Routes**: every URL lives in `src/config/routes.ts`. Old URLs are redirected in `astro.config.mjs`.
- **Layouts**: `BaseLayout` (html + SEO) and `AppLayout` (adds nav, full-viewport `app-shell`). Every page must
  pass a unique `title` and `description`.
- **Client JS** lives in `src/scripts/`; it receives ready-made strings (URLs) via `data-*`/JSON, never raw images.
- **Colors / theme**: never hardcode a color in a page or component. Use the variables from `src/styles/tokens.css`
  (each one is defined once with `light-dark(claro, oscuro)`). The theme lives in `<html data-theme="light|dark">`, is
  applied before first paint by `BaseLayout`, and is changed with `src/scripts/theme.ts` (`toggleTheme`, `onThemeChange`).
  Data-driven colors (rollos, alumnos, hipermedia, 3D scene materials) are the only exception.
- **Fonts** are self-hosted via `@fontsource` (latin subset). Variable fonts register as `"<Name> Variable"`.
- `pnpm check` (`astro-check`) must pass with 0 errors.
