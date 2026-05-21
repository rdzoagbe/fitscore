/**
 * Microsoft Graph OAuth callback for Smart Sync (Outlook mail + calendar).
 * This is SEPARATE from the Supabase Azure sign-in flow.
 *
 * Azure app registration (Smart Sync) must have this redirect URI:
 *   https://joblytics-ai.com/api/smart-sync-microsoft-callback
 *
 * Required env vars:
 *   MICROSOFT_GRAPH_CLIENT_ID
 *   MICROSOFT_GRAPH_CLIENT_SECRET
 *   MICROSOFT_GRAPH_TENANT_ID   (use "common" for multi-tenant / personal accounts)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const REDIRECT_URI = 'https://joblytics-ai.com/api/smart-sync-microsoft-callback'
const TOKEN_URL = `https://login.microsoftonline.com/${process.env.MICROSOFT_GRAPH_TENANT_ID || 'common'}/oauth2/v2.0/token`

function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query

  // Microsoft returned an error
  if (error) {
    console.error('Microsoft OAuth error:', error, error_description)
    return res.redirect(302, `/?sync_error=${encodeURIComponent(error_description || error)}`)
  }

  if (!code) {
    return res.status(400).send('Missing authorization code.')
  }

  // Decode the state param — we encode the Supabase user_id in it when initiating the flow
  let userId
  try {
    const decoded = Buffer.from(state || '', 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    userId = parsed.user_id
  } catch (_) {
    return res.status(400).send('Invalid state parameter.')
  }

  if (!userId) {
    return res.status(400).send('Missing user ID in state.')
  }

  // Exchange the authorization code for tokens
  let tokenData
  try {
    const body = new URLSearchParams({
      client_id: process.env.MICROSOFT_GRAPH_CLIENT_ID,
      client_secret: process.env.MICROSOFT_GRAPH_CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Calendars.Read offline_access'
    })

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error('Token exchange failed:', tokenData.error, tokenData.error_description)
      return res.redirect(302, `/?sync_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`)
    }
  } catch (err) {
    console.error('Token exchange request failed:', err.message)
    return res.status(500).send('Failed to exchange authorization code.')
  }

  // Fetch the user's email from Microsoft Graph
  let providerEmail = ''
  try {
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const me = await meRes.json()
    providerEmail = me.mail || me.userPrincipalName || ''
  } catch (_) {}

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  // Upsert the connection row in Supabase
  const supabase = supabaseAdmin()
  const { error: dbError } = await supabase
    .from('job_sync_connections')
    .upsert({
      user_id: userId,
      provider: 'microsoft',
      status: 'connected',
      provider_email: providerEmail,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: expiresAt,
      scopes: 'Mail.Read Calendars.Read offline_access',
      last_error: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,provider' })

  if (dbError) {
    console.error('DB upsert failed:', dbError.message)
    return res.redirect(302, `/?sync_error=${encodeURIComponent('Could not save connection. Please try again.')}`)
  }

  // Redirect back to app with success signal
  return res.redirect(302, '/coach?sync_connected=microsoft')
}
