import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
}

function createAdminSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getAppUrl(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`.replace(/\/$/, '')
}

function verifyState(state) {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('GOOGLE_OAUTH_STATE_SECRET is not configured.')
  const [body, sig] = String(state || '').split('.')
  if (!body || !sig) throw new Error('Invalid OAuth state.')
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) throw new Error('Invalid OAuth state signature.')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (!payload?.user_id) throw new Error('OAuth state is missing user context.')
  if (Date.now() - Number(payload.ts || 0) > 15 * 60 * 1000) throw new Error('OAuth state expired. Please start sync again.')
  return payload
}

function encrypt(value) {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.')
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(value || ''), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

async function exchangeCodeForTokens({ code, redirectUri }) {
  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error_description || data?.error || 'Could not exchange Google authorization code.')
  return data
}

async function getGoogleProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return null
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const appUrl = getAppUrl(req)

  try {
    const { code, state, error } = req.query || {}
    if (error) return res.redirect(`${appUrl}/messages?sync=cancelled&reason=${encodeURIComponent(error)}`)
    if (!code || !state) return res.redirect(`${appUrl}/messages?sync=failed&reason=missing_oauth_code`)

    const statePayload = verifyState(state)
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/google-sync-callback`
    const tokens = await exchangeCodeForTokens({ code, redirectUri })
    const profile = await getGoogleProfile(tokens.access_token)
    const supabase = createAdminSupabaseClient()
    if (!supabase) throw new Error('Supabase service role is not configured.')

    const expiresAt = tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString() : null
    const scopes = String(tokens.scope || '').split(/\s+/).filter(Boolean)

    const { error: upsertError } = await supabase
      .from('job_sync_connections')
      .upsert({
        user_id: statePayload.user_id,
        provider: 'google',
        provider_email: profile?.email || statePayload.email || null,
        access_token_encrypted: encrypt(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        token_expires_at: expiresAt,
        scopes,
        status: 'connected',
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,provider' })

    if (upsertError) throw upsertError
    return res.redirect(`${appUrl}/messages?sync=connected`)
  } catch (e) {
    console.error('Google sync callback error:', e)
    return res.redirect(`${appUrl}/messages?sync=failed&reason=${encodeURIComponent(e.message || 'sync_failed')}`)
  }
}
