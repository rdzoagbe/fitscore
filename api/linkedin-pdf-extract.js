function setCors(res) {
  res.setHeader?.('Access-Control-Allow-Origin', '*')
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type')
}

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body
}

function cleanText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000)
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(204).end?.()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const body = parseBody(req)
    const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : ''
    const fileName = typeof body.fileName === 'string' ? body.fileName : 'linkedin-profile.pdf'

    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'Missing PDF file.' })
    }

    const normalized = fileBase64.includes(',') ? fileBase64.split(',').pop() : fileBase64
    const buffer = Buffer.from(normalized, 'base64')

    if (!buffer.length) {
      return res.status(400).json({ success: false, error: 'Invalid PDF file.' })
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'PDF is too large. Please upload a file under 5 MB.' })
    }

    const mod = await import('pdf-parse')
    const pdfParse = mod.default || mod
    const parsed = await pdfParse(buffer)
    const text = cleanText(parsed.text)

    if (text.length < 50) {
      return res.status(422).json({ success: false, error: 'Could not extract enough text from this PDF. Please use paste mode.' })
    }

    return res.status(200).json({ success: true, fileName, text, chars: text.length })
  } catch (error) {
    console.error('LinkedIn PDF extract error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Could not extract text from PDF.' })
  }
}
