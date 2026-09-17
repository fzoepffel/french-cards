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
      manifest: {
        name: 'Tessera: Französisch',
        short_name: 'Tessera',
        description: 'Vokabeln, Formen, Grammatik. Französisch Karte für Karte.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#faf6ef',
        theme_color: '#faf6ef',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
