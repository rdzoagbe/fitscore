import crypto from 'node:crypto'

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  return parts.join('; ')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    return res.end('Method not allowed')
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) {
    res.statusCode = 500
    return res.end('Missing LINKEDIN_CLIENT_ID')
  }

  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${getOrigin(req)}/api/auth/linkedin/callback`
  const state = crypto.randomBytes(24).toString('hex')

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('scope', 'openid profile email')

  const secure = (req.headers['x-forwarded-proto'] || 'https') === 'https'
  res.setHeader('Set-Cookie', serializeCookie('linkedin_oauth_state', state, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 10 * 60
  }))
  res.statusCode = 302
  res.setHeader('Location', authUrl.toString())
  return res.end()
}
