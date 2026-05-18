import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      cleanupOutdatedCaches: true,
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//]
      },
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Joblytics — Know before you apply',
        short_name: 'Joblytics',
        description: 'ATS CV analyzer — match your resume to any job offer before applying',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: {
    port: parseInt(process.env.PORT) || 5173,
    host: true
  },
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: true
  }
})