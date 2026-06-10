import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function createServerSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  if (!header || typeof header !== 'string') return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const err = new Error('Your sign-in token was not sent to the server. Refresh the page and try again.')
    err.statusCode = 401
    err.code = 'AUTH_TOKEN_MISSING'
    throw err
  }
  if (!supabase) {
    const err = new Error('Career report storage is not configured on the server. Check Supabase environment variables in Vercel.')
    err.statusCode = 500
    err.code = 'SUPABASE_CONFIG_MISSING'
    throw err
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Your session could not be verified. Please refresh the page or sign in again.')
    err.statusCode = 401
    err.code = 'INVALID_SESSION'
    throw err
  }
  return data.user
}

function normalizeReportRow(row) {
  if (!row) return null
  return {
    id: row.id,
    created_at: row.created_at,
    target_role: row.target_role || row.report?.target_role || 'Career Intelligence',
    target_market: row.target_market || row.report?.target_market || '',
    career_score: row.career_score || row.report?.career_score || 0,
    shortlist_probability: row.shortlist_probability || row.report?.recruiter_view?.shortlist_probability || 0,
    career_level: row.career_level || row.report?.career_level || '',
    market_position: row.market_position || row.report?.market_position || '',
    report: row.report,
    source: 'cloud'
  }
}

export default async function handler(req, res) {
  const supabase = createServerSupabaseClient()

  try {
    const user = await requireUser(req, supabase)

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('career_reports')
        .select('id,created_at,target_role,target_market,career_score,shortlist_probability,career_level,market_position,report')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return res.status(200).json({ reports: (data || []).map(normalizeReportRow).filter(Boolean) })
    }

    if (req.method === 'POST') {
      const report = req.body?.report
      if (!report || typeof report !== 'object') {
        return res.status(400).json({ error: 'A valid report object is required.', code: 'REPORT_REQUIRED' })
      }

      const payload = {
        user_id: user.id,
        email: user.email || null,
        target_role: String(req.body?.targetRole || report.target_role || 'Career Intelligence').slice(0, 180),
        target_market: String(req.body?.targetMarket || report.target_market || '').slice(0, 180),
        career_score: Number(report.career_score) || 0,
        shortlist_probability: Number(report.recruiter_view?.shortlist_probability) || 0,
        career_level: String(report.career_level || '').slice(0, 180),
        market_position: String(report.market_position || '').slice(0, 280),
        report
      }

      const { data, error } = await supabase
        .from('career_reports')
        .insert(payload)
        .select('id,created_at,target_role,target_market,career_score,shortlist_probability,career_level,market_position,report')
        .single()

      if (error) throw error
      return res.status(200).json({ report: normalizeReportRow(data) })
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id
      if (!id) return res.status(400).json({ error: 'Report id is required.', code: 'REPORT_ID_REQUIRED' })

      const { error } = await supabase
        .from('career_reports')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      error: e.message || 'Career reports request failed',
      code: e.code || 'CAREER_REPORTS_FAILED'
    })
  }
}
