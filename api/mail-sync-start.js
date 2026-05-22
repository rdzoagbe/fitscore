import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const PROVIDERS = {
  google: {
    id: 'google',
    label: 'Google',
    // gmail.readonly is RESTRICTED — Google blocks it with 400 for unverified apps, no bypass possible.
    // gmail.metadata is SENSITIVE — shows unverified warning but users can proceed. Returns headers + snippet.
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.metadata', 'https://www.googleapis.com/auth/calendar.readonly']
  },
  microsoft: {
    id: 'microsoft',
    label: 'Microsoft',
    scopes: ['openid', 'email', 'profile', 'offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read']
  }
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

function createServerSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  return String(header).match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const e = new Error('Please sign in before syncing mail and calendar.')
    e.statusCode = 401
    e.code = 'AUTH_TOKEN_MISSING'
    throw e
  }
  if (!supabase) {
    const e = new Error('Supabase is not configured on the server.')
    e.statusCode = 500
    e.code = 'SUPABASE_CONFIG_MISSING'
    throw e
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const e = new Error('Your session could not be verified. Please refresh and try again.')
    e.statusCode = 401
    e.code = 'INVALID_SESSION'
    throw e
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

function stateSecret(provider) {
  return provider === 'microsoft'
    ? (process.env.MICROSOFT_OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
    : (process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
}

function signState(payload) {
  const secret = stateSecret(payload.provider)
  if (!secret) throw new Error(`${payload.provider} OAuth state secret is not configured.`)
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

function providerConfig(provider, appUrl, loginHint) {
  if (provider === 'google') {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const e = new Error('Google sync is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel.')
      e.statusCode = 503
      e.code = 'GOOGLE_OAUTH_NOT_CONFIGURED'
      throw e
    }

    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/mail-sync-callback`,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        ...(loginHint ? { login_hint: loginHint } : {})
      }
    }
  }
  if (provider === 'microsoft') {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      const e = new Error('Microsoft sync is not configured yet. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in Vercel.')
      e.statusCode = 503
      e.code = 'MICROSOFT_OAUTH_NOT_CONFIGURED'
      throw e
    }
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
    return {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${appUrl}/api/microsoft-sync-callback`,
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      params: {
        response_mode: 'query',
        // With login_hint we go straight to consent; without it let the user pick their account
        prompt: loginHint ? 'consent' : 'select_account',
        ...(loginHint ? { login_hint: loginHint } : {})
      }
    }
  }
  const e = new Error('Unsupported mail provider.')
  e.statusCode = 400
  e.code = 'UNSUPPORTED_PROVIDER'
  throw e
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const provider = String(req.body?.provider || req.query?.provider || '').toLowerCase()
    if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Choose google or microsoft.', code: 'PROVIDER_REQUIRED' })
    const loginHint = String(req.body?.login_hint || req.body?.loginHint || req.query?.login_hint || req.query?.loginHint || '').trim() || null
    const supabase = createServerSupabaseClient()
    const user = await requireUser(req, supabase)
    const appUrl = getAppUrl(req)
    const config = providerConfig(provider, appUrl, loginHint)
    const state = signState({ user_id: user.id, email: user.email || null, ts: Date.now(), source: 'smart_tracking', provider })
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: PROVIDERS[provider].scopes.join(' '),
      state,
      ...config.params
    })

    if (loginHint) params.set('login_hint', loginHint)

    return res.status(200).json({ success: true, provider, loginHint: Boolean(loginHint), url: `${config.authUrl}?${params.toString()}` })
  } catch (e) {
    console.error('Mail sync start error:', e)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Could not start mail sync.', code: e.code || 'MAIL_SYNC_START_FAILED' })
  }
}
