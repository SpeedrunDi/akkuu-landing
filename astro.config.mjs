// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://akkuu.kg',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets',
  },
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['@react-three/drei', '@react-three/fiber'],
    },
  },
  integrations: [react(), sitemap()],
});
