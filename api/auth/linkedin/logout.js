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
  if (!['POST', 'GET'].includes(req.method)) {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  const secure = (req.headers['x-forwarded-proto'] || 'https') === 'https'
  res.setHeader('Set-Cookie', [
    serializeCookie('linkedin_identity', '', { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 0 }),
    serializeCookie('linkedin_oauth_state', '', { httpOnly: true, secure, sameSite: 'Lax', path: '/', maxAge: 0 })
  ])
  return res.status(200).json({ success: true, connected: false })
}
