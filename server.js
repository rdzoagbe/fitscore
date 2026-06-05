import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { readdirSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Validate critical env vars at startup — fail loudly instead of silently at request time
const REQUIRED_ENV = ['ANTHROPIC_API_KEY']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) {
  console.error(`[startup] FATAL: Missing required environment variables: ${missing.join(', ')}`)
  console.error('[startup] Set these in Vercel → Settings → Environment Variables, then redeploy.')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging — captured by Vercel log drains / local stdout
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(JSON.stringify({ t: new Date().toISOString(), method: req.method, path: req.path }))
  }
  next()
})

// Mount api/*.js handlers (Vercel serverless format is compatible with Express)
const apiFiles = readdirSync(path.join(__dirname, 'api')).filter(f => f.endsWith('.js'))
for (const file of apiFiles) {
  try {
    const mod = await import(`./api/${file}`)
    if (typeof mod.default === 'function') {
      const route = `/api/${file.slice(0, -3)}`
      app.all(route, mod.default)
    }
  } catch (err) {
    console.error(`[server] Failed to load api/${file}:`, err.message)
  }
}

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => console.log(`Joblytics running on port ${PORT}`))
