import { createClient } from '@supabase/supabase-js'

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

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  return String(header).match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const error = new Error('Please sign in before syncing job activity.')
    error.statusCode = 401
    error.code = 'AUTH_TOKEN_MISSING'
    throw error
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const authError = new Error('Your session could not be verified. Please refresh and try again.')
    authError.statusCode = 401
    authError.code = 'INVALID_SESSION'
    throw authError
  }
  return data.user
}

function emptyResult(extra = {}) {
  return {
    success: true,
    connected: false,
    providers: [],
    scanned: 0,
    eventsStored: 0,
    analysesUpdated: 0,
    breakdown: {
      emailSignals: 0,
      calendarSignals: 0,
      emailEvents: 0,
      calendarEvents: 0
    },
    emails: [],
    calendar: [],
    errors: [],
    ...extra
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const supabase = createAdminSupabaseClient()
    if (!supabase) {
      return res.status(500).json({
        ...emptyResult({ success: false }),
        error: 'Supabase service role is not configured.',
        code: 'SUPABASE_NOT_CONFIGURED'
      })
    }

    const user = await requireUser(req, supabase)

    const { data: connections, error: connectionError } = await supabase
      .from('job_sync_connections')
      .select('id,provider,status,provider_email,scopes,last_sync_at,last_error,updated_at')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .in('provider', ['google', 'microsoft'])
      .order('updated_at', { ascending: false })

    if (connectionError) {
      return res.status(200).json({
        ...emptyResult({ success: false }),
        error: connectionError.message || 'Could not read Smart Sync connection.',
        code: 'SYNC_CONNECTION_READ_FAILED',
        message: 'Smart Sync connection could not be read. Check the Supabase job_sync_connections table.'
      })
    }

    if (!connections?.length) {
      return res.status(409).json({
        ...emptyResult({ success: false }),
        error: 'Connect Gmail or Outlook/Hotmail first.',
        code: 'MAIL_CALENDAR_SYNC_NOT_CONNECTED',
        message: 'Connect Google or Microsoft before running Smart Sync.'
      })
    }

    return res.status(200).json({
      ...emptyResult({
        connected: true,
        providers: connections.map(connection => connection.provider),
        providerEmail: connections[0]?.provider_email || null,
        lastSyncAt: connections[0]?.last_sync_at || null,
        lastError: connections[0]?.last_error || null
      }),
      code: 'SMART_SYNC_SCAN_ENGINE_PAUSED',
      message: 'Smart Sync connection is active. The mail/calendar scan engine is temporarily paused while provider scanning is being stabilized. No user data was changed.'
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ...emptyResult({ success: false }),
      error: error.message || 'Smart Sync failed.',
      code: error.code || 'SMART_JOB_SYNC_FAILED'
    })
  }
}
