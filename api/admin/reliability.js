import { createClient } from '@supabase/supabase-js'

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

async function requireAdmin(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const error = new Error('Admin sign-in required.')
    error.statusCode = 401
    throw error
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) {
    const authError = new Error('Invalid admin session.')
    authError.statusCode = 401
    throw authError
  }

  const email = data.user.email.toLowerCase()
  const envAdmins = String(process.env.ADMIN_EMAILS || 'rolanddzoagbe@gmail.com')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)

  if (envAdmins.includes(email)) return data.user

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .ilike('email', email)
    .maybeSingle()

  if (!adminRow) {
    const denied = new Error('You do not have admin access.')
    denied.statusCode = 403
    throw denied
  }
  return data.user
}

function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item) || 'unknown'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

function normalizeDay(value) {
  return new Date(value).toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return json(res, 500, { error: 'Supabase service credentials are missing.' })

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    await requireAdmin(req, supabase)

    const days = Math.min(Math.max(Number(req.query?.days || 30), 1), 180)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: events, error } = await supabase
      .from('product_error_events')
      .select('id,user_id,source,severity,page_path,message,endpoint,status_code,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) return json(res, 500, { error: error.message })

    const rows = events || []
    const byEndpointRaw = groupBy(rows.filter(r => r.endpoint), r => r.endpoint).slice(0, 12)
    const byMessageRaw = groupBy(rows, r => String(r.message || 'Unknown').slice(0, 160)).slice(0, 12)
    const byDayRaw = groupBy(rows, r => normalizeDay(r.created_at))
    const byDayMap = new Map(byDayRaw.map(item => [item.key, item.count]))
    const byDay = []
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      byDay.push({ day, count: byDayMap.get(day) || 0 })
    }

    return json(res, 200, {
      period_days: days,
      since,
      summary: {
        total_events: rows.length,
        frontend_events: rows.filter(r => r.source === 'frontend').length,
        api_events: rows.filter(r => r.source === 'api').length,
        critical_events: rows.filter(r => ['critical', 'error'].includes(String(r.severity || '').toLowerCase())).length
      },
      by_endpoint: byEndpointRaw.map(item => ({ endpoint: item.key, count: item.count })),
      top_messages: byMessageRaw.map(item => ({ message: item.key, count: item.count })),
      by_day: byDay,
      recent: rows.slice(0, 30)
    })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Reliability dashboard failed.' })
  }
}
