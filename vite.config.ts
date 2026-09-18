import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      workbox: {
        // Precache the shell, but not the decks: only the language actually in use
        // should end up on the device. The deck is cached the first time it loads.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'manifest.webmanifest'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/decks/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'neno-decks',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Neno: Französisch',
        short_name: 'Neno',
        description: 'Vokabeln, Formen, Grammatik. Französisch Karte für Karte.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#e8552f',
        theme_color: '#fff5ea',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
