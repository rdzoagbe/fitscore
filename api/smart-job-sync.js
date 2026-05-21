/**
 * Smart Job Sync — reads mail/calendar from a connected Microsoft or Google account
 * and extracts job-related signals (applications sent, interview invites, recruiter messages).
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MICROSOFT_GRAPH_CLIENT_ID
 *   MICROSOFT_GRAPH_CLIENT_SECRET
 *   MICROSOFT_GRAPH_TENANT_ID
 *   ANTHROPIC_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const MICROSOFT_TOKEN_URL = `https://login.microsoftonline.com/${process.env.MICROSOFT_GRAPH_TENANT_ID || 'common'}/oauth2/v2.0/token`

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function refreshMicrosoftToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_GRAPH_CLIENT_ID,
    client_secret: process.env.MICROSOFT_GRAPH_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read offline_access'
  })

  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  return res.json()
}

async function getMicrosoftMessages(accessToken) {
  // Search for job-related emails in the last 60 days
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const filter = encodeURIComponent(
    `receivedDateTime ge ${since} and (contains(subject,'application') or contains(subject,'interview') or contains(subject,'recruiter') or contains(subject,'position') or contains(subject,'opportunity') or contains(subject,'offer'))`
  )
  const url = `https://graph.microsoft.com/v1.0/me/messages?$filter=${filter}&$select=subject,receivedDateTime,from,bodyPreview&$top=30&$orderby=receivedDateTime desc`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Graph API error ${res.status}`)
  }
  const data = await res.json()
  return data.value || []
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return res.status(204).end()
  }

  res.setHeader('Access-Control-Allow-Origin', '*')

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })

  // Verify the Supabase session
  const supabase = supabaseAdmin()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid session.' })

  const provider = req.query.provider || 'microsoft'

  // Look up the sync connection for this user + provider
  const { data: connection, error: connError } = await supabase
    .from('job_sync_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .eq('status', 'connected')
    .single()

  if (connError || !connection) {
    return res.status(409).json({
      error: 'MAIL_CALENDAR_SYNC_NOT_CONNECTED',
      message: 'Connect Gmail or Outlook/Hotmail first.'
    })
  }

  try {
    let accessToken = connection.access_token

    // Refresh token if expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date(Date.now() + 60000)) {
      if (provider === 'microsoft' && connection.refresh_token) {
        const refreshed = await refreshMicrosoftToken(connection.refresh_token)
        if (refreshed.access_token) {
          accessToken = refreshed.access_token
          await supabase
            .from('job_sync_connections')
            .update({
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token || connection.refresh_token,
              token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', connection.id)
        }
      }
    }

    if (provider !== 'microsoft') {
      return res.status(501).json({ error: 'Google sync requires OAuth verification completion.' })
    }

    // Fetch messages
    const messages = await getMicrosoftMessages(accessToken)

    // Update last_synced
    await supabase
      .from('job_sync_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id)

    return res.status(200).json({
      success: true,
      provider,
      provider_email: connection.provider_email,
      message_count: messages.length,
      messages: messages.map(m => ({
        subject: m.subject,
        from: m.from?.emailAddress?.address || '',
        received: m.receivedDateTime,
        preview: m.bodyPreview?.slice(0, 200) || ''
      }))
    })
  } catch (err) {
    console.error('Smart sync error:', err.message)

    // Mark connection as errored
    await supabase
      .from('job_sync_connections')
      .update({ last_error: err.message, updated_at: new Date().toISOString() })
      .eq('id', connection.id)

    return res.status(500).json({ error: err.message || 'Sync failed. Please reconnect your account.' })
  }
}
