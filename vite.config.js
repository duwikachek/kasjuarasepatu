import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: '/kasjuarasepatu/', // ← Penting untuk GitHub Pages
  resolve: {
    alias: {
      '@service-account': fs.existsSync(path.resolve(__dirname, 'src/config/service-account.json'))
        ? path.resolve(__dirname, 'src/config/service-account.json')
        : path.resolve(__dirname, 'src/config/service-account.example.json')
    }
  },
  server: {
    port: 5173,
    host: true,
    open: false
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Pisahkan Supabase ke chunk terpisah (lazy load)
          'supabase': ['@supabase/supabase-js'],
        }
      }
    }
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // kita register manual di index.html
      manifest: false,       // kita pakai manifest.json manual di public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico}'],
        cacheId: 'kasjuara-v5',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ]
});
