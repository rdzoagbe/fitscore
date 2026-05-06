import crypto from 'node:crypto'

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

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

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`)
  if (options.path) parts.push(`Path=${options.path}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  return parts.join('; ')
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function makeSignedCookie(payload, secret) {
  const body = base64UrlJson(payload)
  return `${body}.${sign(body, secret)}`
}

function redirect(res, target) {
  res.statusCode = 302
  res.setHeader('Location', target)
  return res.end()
}

function fail(res, message) {
  const target = `${process.env.LINKEDIN_ERROR_REDIRECT || '/linkedin'}?linkedin=error&message=${encodeURIComponent(message)}`
  return redirect(res, target)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    return res.end('Method not allowed')
  }

  const { code, state, error, error_description: errorDescription } = req.query || {}
  if (error) return fail(res, errorDescription || error)

  const cookies = parseCookies(req)
  if (!state || !cookies.linkedin_oauth_state || state !== cookies.linkedin_oauth_state) {
    return fail(res, 'LinkedIn login state check failed. Please try again.')
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const cookieSecret = process.env.LINKEDIN_COOKIE_SECRET || clientSecret
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${getOrigin(req)}/api/auth/linkedin/callback`

  if (!clientId || !clientSecret || !cookieSecret) {
    res.statusCode = 500
    return res.end('Missing LinkedIn OAuth environment variables')
  }
  if (!code) return fail(res, 'Missing LinkedIn authorization code.')

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  })

  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody
  })

  const tokenData = await tokenResponse.json().catch(() => ({}))
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error('LinkedIn token error:', tokenData)
    return fail(res, tokenData.error_description || tokenData.error || 'LinkedIn token exchange failed.')
  }

  const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  })

  const userInfo = await userInfoResponse.json().catch(() => ({}))
  if (!userInfoResponse.ok || !userInfo.sub) {
    console.error('LinkedIn userinfo error:', userInfo)
    return fail(res, userInfo.message || 'Could not read LinkedIn identity information.')
  }

  const profile = {
    provider: 'linkedin',
    sub: userInfo.sub,
    name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
    given_name: userInfo.given_name || '',
    family_name: userInfo.family_name || '',
    email: userInfo.email || '',
    email_verified: Boolean(userInfo.email_verified),
    picture: userInfo.picture || '',
    locale: userInfo.locale || '',
    connected_at: new Date().toISOString()
  }

  const secure = (req.headers['x-forwarded-proto'] || 'https') === 'https'
  const identityCookie = makeSignedCookie(profile, cookieSecret)
  const successTarget = process.env.LINKEDIN_SUCCESS_REDIRECT || '/linkedin?linkedin=connected'

  res.setHeader('Set-Cookie', [
    serializeCookie('linkedin_oauth_state', '', { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 0 }),
    serializeCookie('linkedin_identity', identityCookie, { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  ])

  return redirect(res, successTarget)
}
