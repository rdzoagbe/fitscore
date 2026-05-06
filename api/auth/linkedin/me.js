import crypto from 'node:crypto'

function parseCookies(req) {
  const header = req.headers.cookie || ''
  return Object.fromEntries(header.split(';').map(part => {
    const index = part.indexOf('=')
    if (index === -1) return null
    const key = part.slice(0, index).trim()
    const value = decodeURIComponent(part.slice(index + 1).trim())
    return [key, value]
  }).filter(Boolean))
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function readSignedCookie(value, secret) {
  if (!value || !secret) return null
  const [body, signature] = value.split('.')
  if (!body || !signature) return null
  const expected = sign(body, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const cookieSecret = process.env.LINKEDIN_COOKIE_SECRET || process.env.LINKEDIN_CLIENT_SECRET
  const cookies = parseCookies(req)
  const profile = readSignedCookie(cookies.linkedin_identity, cookieSecret)

  if (!profile) {
    return res.status(200).json({ success: true, connected: false, profile: null })
  }

  return res.status(200).json({ success: true, connected: true, profile })
}
