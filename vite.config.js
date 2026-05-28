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
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
          if (id.includes('@supabase')) return 'vendor-supabase'
          // dynamic-import-only libs — return undefined so Vite auto-splits them as true lazy chunks
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('docx') || id.includes('file-saver')) return undefined
          if (id.includes('mammoth') || id.includes('pdfjs-dist') || id.includes('pdf-parse')) return 'vendor-parsers'
          return 'vendor'
        }
      }
    }
  },
  server: {
    port: parseInt(process.env.PORT) || 5173,
    host: true
  },
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: true
  }
})