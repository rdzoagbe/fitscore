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
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

function getAppUrl(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`.replace(/\/$/, '')
}

function providerStateSecret(provider) {
  return provider === 'microsoft'
    ? (process.env.MICROSOFT_OAUTH_STATE_SECRET || process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
    : (process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
}

function verifyState(state) {
  const [body, signature] = String(state || '').split('.')
  if (!body || !signature) throw new Error('Invalid sync authorization state.')
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  const provider = payload.provider
  const secret = providerStateSecret(provider)
  if (!secret) throw new Error(`${provider || 'Provider'} OAuth state secret is not configured.`)
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const received = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (received.length !== expectedBuffer.length || !crypto.timingSafeEqual(received, expectedBuffer)) throw new Error('Sync authorization state could not be verified.')
  if (!payload.user_id || !provider) throw new Error('Sync authorization state is missing required information.')
  if (payload.ts && Date.now() - Number(payload.ts) > 15 * 60 * 1000) throw new Error('Sync authorization request expired. Please try again.')
  return payload
}

function tokenSecret(provider) {
  return provider === 'microsoft'
    ? (process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY || process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
    : (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
}

function encryptToken(value, provider) {
  if (!value) return null
  const secret = tokenSecret(provider)
  if (!secret) throw new Error(`${provider} token encryption key is not configured.`)
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function redirectToMessages(res, appUrl, params) {
  const url = new URL('/messages', appUrl)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  res.writeHead(302, { Location: url.toString() })
  res.end()
}

function getProviderConfig(provider, appUrl) {
  if (provider === 'google') {
    return {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/mail-sync-callback`
    }
  }
  if (provider === 'microsoft') {
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
    return {
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      profileUrl: 'https://graph.microsoft.com/v1.0/me',
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${appUrl}/api/mail-sync-callback`
    }
  }
  throw new Error('Unsupported sync provider.')
}

async function exchangeCodeForTokens({ provider, code, appUrl }) {
  const config = getProviderConfig(provider, appUrl)
  if (!config.clientId || !config.clientSecret) throw new Error(`${provider} OAuth client is not configured.`)
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error_description || data?.error || `Could not complete ${provider} authorization.`)
  if (!data.access_token) throw new Error(`${provider} did not return an access token.`)
  return data
}

async function fetchProviderProfile(provider, accessToken, appUrl) {
  const config = getProviderConfig(provider, appUrl)
  const response = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return { email: null, name: null, raw: data }
  if (provider === 'microsoft') {
    return { email: data.mail || data.userPrincipalName || null, name: data.displayName || null, raw: data }
  }
  return { email: data.email || null, name: data.name || null, raw: data }
}

async function saveConnection({ supabase, provider, statePayload, tokenData, profile }) {
  const encryptedAccess = encryptToken(tokenData.access_token, provider)
  const encryptedRefresh = tokenData.refresh_token ? encryptToken(tokenData.refresh_token, provider) : null
  const expiresAt = tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : null
  const now = new Date().toISOString()
  const basePayload = {
    user_id: statePayload.user_id,
    provider,
    provider_email: profile.email || statePayload.email || null,
    access_token_encrypted: encryptedAccess,
    token_expires_at: expiresAt,
    scopes: tokenData.scope || null,
    status: 'connected',
    last_error: null,
    metadata: {
      provider_name: profile.name || null,
      connected_via: 'smart_tracking',
      profile: profile.raw || null
    },
    updated_at: now
  }

  const { data: existing, error: selectError } = await supabase
    .from('job_sync_connections')
    .select('id, refresh_token_encrypted')
    .eq('user_id', statePayload.user_id)
    .eq('provider', provider)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing?.id) {
    const updatePayload = { ...basePayload }
    if (encryptedRefresh) updatePayload.refresh_token_encrypted = encryptedRefresh
    const { error } = await supabase.from('job_sync_connections').update(updatePayload).eq('id', existing.id)
    if (error) throw error
    return existing.id
  }

  const insertPayload = {
    ...basePayload,
    refresh_token_encrypted: encryptedRefresh,
    created_at: now
  }
  const { data, error } = await supabase.from('job_sync_connections').insert(insertPayload).select('id').single()
  if (error) throw error
  return data?.id
}

export default async function handler(req, res) {
  const appUrl = getAppUrl(req)
  try {
    const oauthError = req.query?.error
    if (oauthError) {
      return redirectToMessages(res, appUrl, { sync: 'failed', reason: req.query?.error_description || oauthError })
    }

    const code = req.query?.code
    const state = req.query?.state
    if (!code || !state) return redirectToMessages(res, appUrl, { sync: 'failed', reason: 'Missing authorization response.' })

    const supabase = createAdminSupabaseClient()
    if (!supabase) throw new Error('Supabase service role is not configured.')

    const statePayload = verifyState(state)
    const provider = statePayload.provider
    const tokenData = await exchangeCodeForTokens({ provider, code, appUrl })
    const profile = await fetchProviderProfile(provider, tokenData.access_token, appUrl)
    await saveConnection({ supabase, provider, statePayload, tokenData, profile })

    return redirectToMessages(res, appUrl, { sync: 'connected', provider })
  } catch (error) {
    console.error('Mail sync callback error:', error)
    return redirectToMessages(res, appUrl, { sync: 'failed', reason: error.message || 'Mail/calendar sync could not be completed.' })
  }
}
