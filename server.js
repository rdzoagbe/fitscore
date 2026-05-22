import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { readdirSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

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
