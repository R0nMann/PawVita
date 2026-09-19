import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In development the app calls /api on its own origin and Vite forwards it
  // to the API server, so no CORS setup is needed locally.
  const apiProxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true },
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Installable, offline-capable app (architecture §12): the app shell and
      // reference data are cached so the farmer app opens without signal.
      // Reports made offline wait in the IndexedDB outbox (src/offline).
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/*.png'],
        manifest: {
          name: 'PawVita — Livestock Disease Surveillance',
          short_name: 'PawVita',
          description:
            'Report livestock disease, track your herd and get veterinary advice — even without a signal.',
          lang: 'en-IN',
          theme_color: '#1B4332',
          background_color: '#FAF9F6',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          runtimeCaching: [
            {
              // Symptom catalogue and village list: needed to fill in a report offline.
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/v1/catalog') || url.pathname.startsWith('/api/v1/regions'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'pawvita-reference',
                expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'pawvita-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: process.env.HOST || 'localhost',
      port: Number(process.env.PORT || 5173),
      // Client-side routes such as /user/farmer/home must fall back to index.html.
      strictPort: false,
      proxy: apiProxy,
    },
    preview: {
      port: Number(process.env.PORT || 4173),
      proxy: apiProxy,
    },
  }
})
