// Vercel Edge Middleware — runs before serverless functions, zero cold start
// Handles IP-based burst protection and basic request validation for /api/analyze

const ipWindows = new Map() // { ip: { count, windowStart } }
const WINDOW_MS = 60_000
const IP_LIMIT = 30 // per minute per IP — well above real user pace

function isIpLimited(ip) {
  const now = Date.now()
  const entry = ipWindows.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipWindows.set(ip, { count: 1, windowStart: now })
    return false
  }
  if (entry.count >= IP_LIMIT) return true
  entry.count++
  return false
}

export default function middleware(request) {
  const url = new URL(request.url)

  // Only guard the analyze endpoint; pass everything else through
  if (!url.pathname.startsWith('/api/analyze')) return

  // OPTIONS pre-flight — let CORS headers on the handler deal with it
  if (request.method === 'OPTIONS') return

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (isIpLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.', code: 'IP_RATE_LIMITED' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
    )
  }

  // Reject POST requests that lack the device ID — every legitimate app request sends it
  if (request.method === 'POST') {
    const deviceId = request.headers.get('x-joblytics-device-id')
    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid request.', code: 'MISSING_DEVICE_ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}

export const config = {
  matcher: ['/api/analyze', '/api/analyze-accurate']
}
