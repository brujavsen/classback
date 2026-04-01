import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['classback-logo.ico', 'classback-logo.png'],
      manifest: {
        name: 'ClassBack',
        short_name: 'ClassBack',
        description: 'Comparte material educativo de forma rápida, simple y organizada.',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/classback-logo-192px.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/classback-logo-512px.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
