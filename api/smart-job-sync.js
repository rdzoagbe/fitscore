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

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const err = new Error('Please sign in before syncing job activity.')
    err.statusCode = 401
    err.code = 'AUTH_TOKEN_MISSING'
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

function decrypt(value) {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.')
  const raw = Buffer.from(String(value || ''), 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const key = crypto.createHash('sha256').update(secret).digest()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

async function refreshAccessToken(connection, supabase) {
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) {
    return decrypt(connection.access_token_encrypted)
  }
  if (!connection.refresh_token_encrypted) return decrypt(connection.access_token_encrypted)

  const refreshToken = decrypt(connection.refresh_token_encrypted)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error_description || data?.error || 'Could not refresh Google token.')

  const expiresAt = data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null
  const encrypted = encrypt(data.access_token)
  await supabase.from('job_sync_connections').update({ access_token_encrypted: encrypted, token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('id', connection.id)
  return data.access_token
}

function encrypt(value) {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(value || ''), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function getAnalysisTerms(analysis) {
  const context = analysis.result?.job_context || {}
  const title = clean(analysis.job_title || context.title)
  const company = clean(context.company)
  const host = (() => {
    try { return new URL(analysis.job_url).hostname.replace(/^www\./, '') } catch { return '' }
  })()
  return { title, company, host }
}

function isMeaningfulTerm(value) {
  const text = clean(value).toLowerCase()
  return text && text !== 'not specified' && text !== 'unknown' && text.length >= 3
}

function buildGmailQuery(analyses) {
  const terms = new Set()
  analyses.slice(0, 30).forEach(analysis => {
    const { company, host } = getAnalysisTerms(analysis)
    if (isMeaningfulTerm(company)) terms.add(`"${company}"`)
    if (isMeaningfulTerm(host)) terms.add(`"${host}"`)
  })
  const termQuery = Array.from(terms).slice(0, 20).join(' OR ')
  const base = '(application OR candidature OR interview OR entretien OR recruiter OR recrutement OR rejected OR refus OR offer OR offre)'
  return termQuery ? `newer_than:180d ${base} (${termQuery})` : `newer_than:180d ${base}`
}

async function googleGet(url, accessToken) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || data?.error || 'Google API request failed.')
  return data
}

async function fetchGmailSignals(accessToken, analyses) {
  const q = buildGmailQuery(analyses)
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(q)}`
  const list = await googleGet(listUrl, accessToken)
  const messages = list.messages || []
  const signals = []

  for (const msg of messages.slice(0, 20)) {
    const detail = await googleGet(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, accessToken)
    const headers = detail.payload?.headers || []
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || null
    const snippet = detail.snippet || ''
    signals.push({ source: 'gmail', provider_id: msg.id, subject, from, date, snippet, text: `${subject} ${from} ${snippet}` })
  }
  return signals
}

async function fetchCalendarSignals(accessToken, analyses) {
  const timeMin = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&q=${encodeURIComponent('interview entretien recruiter hiring recrutement')}`
  const data = await googleGet(url, accessToken)
  return (data.items || []).slice(0, 50).map(event => ({
    source: 'calendar',
    provider_id: event.id,
    subject: event.summary || '',
    from: (event.attendees || []).map(a => a.email).filter(Boolean).join(', '),
    date: event.start?.dateTime || event.start?.date || null,
    snippet: event.location || event.description || '',
    text: `${event.summary || ''} ${(event.attendees || []).map(a => a.email).join(' ')} ${event.location || ''} ${event.description || ''}`
  }))
}

function classifySignal(text) {
  const lower = clean(text).toLowerCase()
  if (/interview|entretien|meet|meeting|teams|zoom|calendar|calendrier/.test(lower)) return { status: 'interview', eventType: 'interview_scheduled', confidence: 0.86 }
  if (/offer|offre|proposition|contrat|contract/.test(lower)) return { status: 'offer', eventType: 'offer_signal', confidence: 0.82 }
  if (/unfortunately|regret|not selected|rejected|refus|malheureusement|pas retenu|ne pas donner suite/.test(lower)) return { status: 'rejected', eventType: 'rejection', confidence: 0.84 }
  if (/thank you for applying|application received|candidature reçue|merci pour votre candidature|submitted/.test(lower)) return { status: 'applied', eventType: 'application_confirmed', confidence: 0.75 }
  if (/follow up|relance|next step|prochaine étape|availability|disponibilit/.test(lower)) return { status: 'applied', eventType: 'follow_up_needed', confidence: 0.7 }
  return null
}

function matchSignalToAnalysis(signal, analyses) {
  const lower = clean(signal.text).toLowerCase()
  let best = null
  let bestScore = 0
  for (const analysis of analyses) {
    const { title, company, host } = getAnalysisTerms(analysis)
    let score = 0
    if (isMeaningfulTerm(company) && lower.includes(company.toLowerCase())) score += 4
    if (isMeaningfulTerm(host) && lower.includes(host.toLowerCase())) score += 3
    if (isMeaningfulTerm(title)) {
      const words = title.toLowerCase().split(/\W+/).filter(w => w.length > 3)
      score += words.filter(w => lower.includes(w)).length
    }
    if (score > bestScore) { best = analysis; bestScore = score }
  }
  return bestScore >= 3 ? best : null
}

async function applySignals({ supabase, user, analyses, signals }) {
  const events = []
  const updates = new Map()

  for (const signal of signals) {
    const matched = matchSignalToAnalysis(signal, analyses)
    const classification = classifySignal(signal.text)
    if (!matched || !classification) continue

    const event = {
      user_id: user.id,
      analysis_id: matched.id,
      source: signal.source,
      provider_event_id: signal.provider_id,
      event_type: classification.eventType,
      detected_status: classification.status,
      confidence: classification.confidence,
      subject: clean(signal.subject).slice(0, 300),
      sender_or_attendees: clean(signal.from).slice(0, 300),
      event_at: signal.date ? new Date(signal.date).toISOString() : new Date().toISOString(),
      snippet: clean(signal.snippet).slice(0, 500),
      metadata: { auto_detected: true }
    }
    events.push(event)

    const priority = { rejected: 1, applied: 2, interview: 3, offer: 4 }
    const current = updates.get(matched.id)
    if (!current || priority[classification.status] > priority[current.status]) updates.set(matched.id, { status: classification.status, event })
  }

  if (events.length) {
    await supabase.from('job_tracking_events').upsert(events, { onConflict: 'user_id,source,provider_event_id,analysis_id,event_type' })
  }

  for (const [analysisId, value] of updates.entries()) {
    await supabase.from('analyses').update({ application_status: value.status, status_updated_at: new Date().toISOString() }).eq('id', analysisId).eq('user_id', user.id)
  }

  return { eventsStored: events.length, analysesUpdated: updates.size }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createAdminSupabaseClient()
    if (!supabase) throw new Error('Supabase service role is not configured.')
    const user = await requireUser(req, supabase)

    const { data: connection, error: connError } = await supabase
      .from('job_sync_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('status', 'connected')
      .single()

    if (connError || !connection) return res.status(409).json({ error: 'Connect Gmail and Calendar first.', code: 'GOOGLE_SYNC_NOT_CONNECTED' })

    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('id, user_id, job_url, job_title, result, application_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    if (analysesError) throw analysesError
    if (!analyses?.length) return res.status(200).json({ success: true, connected: true, scanned: 0, eventsStored: 0, analysesUpdated: 0, message: 'No analyzed jobs found yet.' })

    const accessToken = await refreshAccessToken(connection, supabase)
    const gmail = await fetchGmailSignals(accessToken, analyses)
    const calendar = await fetchCalendarSignals(accessToken, analyses)
    const result = await applySignals({ supabase, user, analyses, signals: [...gmail, ...calendar] })

    await supabase.from('job_sync_connections').update({ last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', connection.id)

    return res.status(200).json({ success: true, connected: true, scanned: gmail.length + calendar.length, ...result })
  } catch (e) {
    console.error('Smart job sync error:', e)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Smart sync failed.', code: e.code || 'SMART_JOB_SYNC_FAILED' })
  }
}
