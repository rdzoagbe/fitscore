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

function trim(value, max = 4000) {
  if (value == null) return null
  return String(value).slice(0, max)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return json(res, 500, { error: 'Supabase service credentials are missing.' })

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const token = getBearerToken(req)
    let user = null
    if (token) {
      const { data } = await supabase.auth.getUser(token)
      user = data?.user || null
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const row = {
      user_id: user?.id || null,
      source: trim(body.source || 'frontend', 60),
      severity: trim(body.severity || 'error', 40),
      page_path: trim(body.page_path, 500),
      message: trim(body.message || 'Unknown reliability event', 1000),
      stack: trim(body.stack, 8000),
      endpoint: trim(body.endpoint, 500),
      status_code: body.status_code ? Number(body.status_code) : null,
      browser: body.browser || {},
      metadata: body.metadata || {}
    }

    const { error } = await supabase.from('product_error_events').insert(row)
    if (error) return json(res, 200, { ok: false, logged: false, reason: error.message })
    return json(res, 200, { ok: true, logged: true })
  } catch (error) {
    return json(res, 200, { ok: false, logged: false, reason: error.message })
  }
}
