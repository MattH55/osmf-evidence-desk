import { defineConfig } from 'astro/config';

// Static output — GitHub Pages at custom domain desk.opensourcemed.info (ED-17).
// base defaults to '/' (required for custom domain; do not use a project-pages subpath).
export default defineConfig({
  site: 'https://desk.opensourcemed.info',
  output: 'static',
});
