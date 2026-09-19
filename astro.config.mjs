import { defineConfig } from 'astro/config';

// Static output (default) — deployable to Vercel static hosting (ED-17).
export default defineConfig({
  site: 'https://desk.opensourcemed.info',
  output: 'static',
});
