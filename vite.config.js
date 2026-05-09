import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'og-image.svg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Joblytics AI — Career growth workspace',
        short_name: 'Joblytics',
        description: 'ATS CV checker, cover letter generator, job tracker, and interview preparation workspace for job seekers.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'productivity', 'education'],
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
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
