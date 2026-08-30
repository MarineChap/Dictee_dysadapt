import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// `VITE_BASE` lets the GitHub Pages workflow serve the app from a sub-path
// (/Dictee_dysadapt/) while local dev and the Capacitor bundle stay at the root.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // Tesseract ships its own worker/wasm; we serve them from public/ instead so
  // nothing is ever fetched from a CDN. Keeping it out of optimizeDeps avoids
  // Vite rewriting the worker path at dev time.
  optimizeDeps: { exclude: ['tesseract.js'] },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'fonts/*', 'tesseract/*'],
      manifest: {
        name: 'Dictadapt — aide à la dictée',
        short_name: 'Dictadapt',
        description:
          "Outil d'aide à la dictée pour les élèves en difficulté. Fonctionne entièrement hors ligne.",
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#4f46e5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,ttf,wasm,gz,traineddata}'],
        // The Tesseract SIMD core is ~13 MB; without this it is silently skipped
        // and the app would need the network for OCR.
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
