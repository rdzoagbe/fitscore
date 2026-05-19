import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SCOPES = ['openid', 'email', 'profile', 'offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read']

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

function createServerSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const err = new Error('Please sign in before syncing mail and calendar.')
    err.statusCode = 401
    err.code = 'AUTH_TOKEN_MISSING'
    throw err
  }
  if (!supabase) {
    const err = new Error('Supabase is not configured on the server.')
    err.statusCode = 500
    err.code = 'SUPABASE_CONFIG_MISSING'
    throw err
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Your session could not be verified. Please refresh and try again.')
    err.statusCode = 401
    err.code = 'INVALID_SESSION'
    throw err
  }
  return data.user
}

function getAppUrl(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`.replace(/\/$/, '')
}

function signState(payload) {
  const secret = process.env.MICROSOFT_OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('MICROSOFT_OAUTH_STATE_SECRET is not configured.')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(503).json({
        error: 'Microsoft mail/calendar sync is not configured yet. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in Vercel.',
        code: 'MICROSOFT_OAUTH_NOT_CONFIGURED'
      })
    }

    const supabase = createServerSupabaseClient()
    const user = await requireUser(req, supabase)
    const appUrl = getAppUrl(req)
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${appUrl}/api/microsoft-sync-callback`
    const state = signState({ user_id: user.id, email: user.email || null, ts: Date.now(), source: 'smart_tracking_microsoft' })

    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: SCOPES.join(' '),
      state,
      prompt: 'select_account'
    })

    return res.status(200).json({ success: true, url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}` })
  } catch (e) {
    console.error('Microsoft sync start error:', e)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Could not start Microsoft sync.', code: e.code || 'MICROSOFT_SYNC_START_FAILED' })
  }
}
