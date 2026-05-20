import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() { return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL }
function getSupabaseServiceKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY }
function createAdminSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseServiceKey()
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}
function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  return String(header).match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
}
async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) return { user: null, error: 'Missing user access token.', status: 401 }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { user: null, error: 'User session could not be verified.', status: 401 }
  return { user: data.user, error: null, status: 200 }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' })
  const checks = {
    supabaseConfigured: false,
    userSession: false,
    connectionTableReadable: false,
    hasConnectedProvider: false,
    hasAccessToken: false,
    hasRefreshToken: false,
    provider: null,
    tokenExpiresAt: null,
    lastSyncAt: null,
    lastError: null,
    recommendations: []
  }
  try {
    const supabase = createAdminSupabaseClient()
    checks.supabaseConfigured = Boolean(supabase)
    if (!supabase) return res.status(500).json({ ok: false, checks, error: 'Supabase service role is not configured.' })

    const auth = await requireUser(req, supabase)
    checks.userSession = Boolean(auth.user)
    if (!auth.user) {
      checks.recommendations.push('Sign out and sign in again, then retry Smart Sync.')
      return res.status(auth.status).json({ ok: false, checks, error: auth.error })
    }

    const { data, error } = await supabase
      .from('job_sync_connections')
      .select('provider,status,provider_email,access_token_encrypted,refresh_token_encrypted,token_expires_at,last_sync_at,last_error,updated_at')
      .eq('user_id', auth.user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    checks.connectionTableReadable = !error
    if (error) {
      checks.recommendations.push('Check that the job_sync_connections table and columns exist in Supabase.')
      return res.status(200).json({ ok: false, checks, error: error.message })
    }

    checks.hasConnectedProvider = Boolean(data && data.status === 'connected')
    checks.provider = data?.provider || null
    checks.hasAccessToken = Boolean(data?.access_token_encrypted)
    checks.hasRefreshToken = Boolean(data?.refresh_token_encrypted)
    checks.tokenExpiresAt = data?.token_expires_at || null
    checks.lastSyncAt = data?.last_sync_at || null
    checks.lastError = data?.last_error || null

    if (!data) checks.recommendations.push('No Smart Sync connection found. Open /connect-sync.html and connect Google or Microsoft.')
    if (data && data.status !== 'connected') checks.recommendations.push('Provider exists but is not marked connected. Reconnect Smart Sync.')
    if (data && !data.access_token_encrypted) checks.recommendations.push('Provider connection has no saved access token. Reconnect Smart Sync.')
    if (data && !data.refresh_token_encrypted) checks.recommendations.push('No refresh token saved. Reconnect and ensure offline access/consent is granted.')
    if (data?.last_error) checks.recommendations.push('Last sync error is present. Reconnect if the same error continues.')

    return res.status(200).json({ ok: checks.supabaseConfigured && checks.userSession && checks.connectionTableReadable && checks.hasConnectedProvider && checks.hasAccessToken, checks })
  } catch (error) {
    return res.status(500).json({ ok: false, checks, error: error.message || 'Health check failed.' })
  }
}
