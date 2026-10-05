// @ts-check
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

/** Bucket público de fotos (Supabase Storage en producción). */
const MEDIA_HOST = process.env.MEDIA_HOST ?? 'mwovajxsnknimpxjuciw.supabase.co';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  integrations: [react()],
  adapter: vercel({
    // Optimizador de Vercel (`/_vercel/image`): ver `src/lib/images.ts`.
    imagesConfig: {
      sizes: [384, 640, 828, 1080, 1600, 2048],
      formats: ['image/avif', 'image/webp'],
      remotePatterns: [{ protocol: 'https', hostname: MEDIA_HOST }],
    },
  }),
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  server: { port: 4321 },
  vite: {
    plugins: [tailwindcss()],
  },
});
