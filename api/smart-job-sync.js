import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import {
  buildGmailQuery,
  clean,
  cleanBody,
  classifyStatus,
  confidenceLabel,
  detectPlatform,
  eventIsInterview,
  extractCompany,
  extractGmailBody,
  isNoiseSubject,
  parseFromHeader,
  simpleSummary
} from './lib/jobSignalClassifier.js'

const EMAIL_SOURCES = new Set(['gmail', 'outlook'])
const CALENDAR_SOURCES = new Set(['calendar', 'ms_calendar'])
const STORE_EVENT_THRESHOLD = 0.65
const AUTO_UPDATE_THRESHOLD = 0.82

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
  if (!token) { const err = new Error('Please sign in before syncing job activity.'); err.statusCode = 401; err.code = 'AUTH_TOKEN_MISSING'; throw err }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) { const err = new Error('Your session could not be verified. Please refresh and try again.'); err.statusCode = 401; err.code = 'INVALID_SESSION'; throw err }
  return data.user
}
function tokenSecret(provider) {
  return provider === 'microsoft'
    ? (process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY || process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
    : (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STRIPE_SECRET_KEY)
}
function decrypt(value, provider) {
  const secret = tokenSecret(provider)
  if (!secret) throw new Error(`${provider} token encryption key is not configured.`)
  const raw = Buffer.from(String(value || ''), 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const key = crypto.createHash('sha256').update(secret).digest()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
function encrypt(value, provider) {
  const secret = tokenSecret(provider)
  if (!secret) throw new Error(`${provider} token encryption key is not configured.`)
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(String(value || ''), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}
async function refreshAccessToken(connection, supabase) {
  const provider = connection.provider || 'google'
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60_000) return decrypt(connection.access_token_encrypted, provider)
  if (!connection.refresh_token_encrypted) return decrypt(connection.access_token_encrypted, provider)

  const refreshToken = decrypt(connection.refresh_token_encrypted, provider)
  const isMicrosoft = provider === 'microsoft'
  const tokenUrl = isMicrosoft ? `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token` : 'https://oauth2.googleapis.com/token'
  const params = isMicrosoft
    ? { client_id: process.env.MICROSOFT_CLIENT_ID, client_secret: process.env.MICROSOFT_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }
    : { client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' }

  const response = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error_description || data?.error || `Could not refresh ${provider} token.`)
  const expiresAt = data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null
  await supabase.from('job_sync_connections').update({ access_token_encrypted: encrypt(data.access_token, provider), token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('id', connection.id)
  return data.access_token
}
function providerGet(url, accessToken) {
  return fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }).then(async response => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.error?.message || data?.error_description || data?.error || 'Provider API request failed.')
    return data
  })
}
function getAnalysisTerms(analysis) {
  const context = analysis.result?.job_context || {}
  const title = clean(analysis.job_title || context.title)
  const company = clean(context.company)
  const host = (() => { try { return new URL(analysis.job_url).hostname.replace(/^www\./, '') } catch { return '' } })()
  return { title, company, host }
}
function isMeaningfulTerm(value) {
  const text = clean(value).toLowerCase()
  return text && text !== 'not specified' && text !== 'unknown' && text.length >= 3
}
function titleCaseStatus(status) {
  if (status === 'rejected') return 'Rejected'
  if (status === 'interview') return 'Interview'
  if (status === 'offer') return 'Offer'
  if (status === 'applied') return 'In progress'
  return 'Sent'
}
function safeIso(value) {
  try { return value ? new Date(value).toISOString() : new Date().toISOString() } catch { return new Date().toISOString() }
}
function matchSignalToAnalysis(signal, analyses) {
  const lower = clean(`${signal.text || ''} ${signal.company || ''} ${signal.platform || ''}`).toLowerCase()
  let best = null
  let bestScore = 0
  let reasons = []
  for (const analysis of analyses) {
    const { title, company, host } = getAnalysisTerms(analysis)
    let score = 0
    const nextReasons = []
    if (isMeaningfulTerm(company) && lower.includes(company.toLowerCase())) { score += 4; nextReasons.push('company') }
    if (isMeaningfulTerm(host) && lower.includes(host.toLowerCase())) { score += 3; nextReasons.push('domain') }
    if (isMeaningfulTerm(title)) {
      const words = title.toLowerCase().split(/\W+/).filter(w => w.length > 3)
      const hits = words.filter(w => lower.includes(w)).length
      score += Math.min(hits, 4)
      if (hits) nextReasons.push('job title')
    }
    if (score > bestScore) { best = analysis; bestScore = score; reasons = nextReasons }
  }
  return bestScore >= 3 ? { analysis: best, score: bestScore, reasons } : { analysis: null, score: bestScore, reasons: [] }
}
function buildEmailResult(signal, classification, match) {
  const terms = match.analysis ? getAnalysisTerms(match.analysis) : {}
  const confidence = Math.min(0.98, classification.confidence + Math.min(0.1, (match.score || 0) * 0.02))
  return {
    id: signal.provider_event_id,
    source: signal.source,
    sourceLabel: signal.source === 'gmail' ? 'Gmail' : 'Outlook',
    title: clean(`${terms.company || signal.company || 'Detected'} — ${terms.title || signal.subject || 'Job email'}`, 160),
    company: terms.company || signal.company || '',
    matchedJobId: match.analysis?.id || null,
    matchedJobTitle: terms.title || null,
    status: classification.label || titleCaseStatus(classification.status),
    detected_status: classification.status,
    eventType: classification.eventType,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    platform: signal.platform || '',
    subject: signal.subject || '',
    from: signal.from || '',
    date: signal.date || null,
    snippet: signal.snippet || '',
    body: signal.body || signal.snippet || '',
    summary: simpleSummary(signal, { ...classification, confidence })
  }
}
function buildCalendarResult(signal, classification, match) {
  const terms = match.analysis ? getAnalysisTerms(match.analysis) : {}
  const confidence = Math.min(0.98, Math.max(0.86, classification.confidence) + Math.min(0.08, (match.score || 0) * 0.015))
  return {
    id: signal.provider_event_id,
    source: signal.source,
    sourceLabel: signal.source === 'calendar' ? 'Google Calendar' : 'Microsoft Calendar',
    title: clean(`${terms.company || signal.company || 'Detected'} — ${terms.title || signal.subject || 'Calendar event'}`, 160),
    company: terms.company || signal.company || '',
    matchedJobId: match.analysis?.id || null,
    matchedJobTitle: terms.title || null,
    status: 'Interview',
    detected_status: 'interview',
    eventType: 'interview_scheduled',
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    eventTitle: signal.subject || '',
    subject: signal.subject || '',
    date: signal.date || null,
    attendees: signal.from || '',
    from: signal.from || '',
    location: signal.location || '',
    snippet: signal.snippet || '',
    detail: signal.snippet || '',
    summary: simpleSummary({ ...signal, eventTitle: signal.subject }, { label: 'Interview', eventType: 'interview_scheduled' })
  }
}
async function fetchGoogleSignals(accessToken) {
  const signals = []
  const searchAfter = process.env.SMART_SYNC_SEARCH_AFTER || '2025/01/01'
  const list = await providerGet(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(buildGmailQuery(searchAfter))}`, accessToken)
  for (const msg of (list.messages || []).slice(0, 40)) {
    const detail = await providerGet(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, accessToken)
    const headers = detail.payload?.headers || []
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
    if (isNoiseSubject(subject)) continue
    const fromRaw = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || null
    const sender = parseFromHeader(fromRaw)
    const snippet = detail.snippet || ''
    const body = cleanBody(extractGmailBody(detail.payload))
    const platform = detectPlatform(sender.name, sender.email)
    const company = extractCompany(sender.name, sender.email, subject)
    signals.push({ source: 'gmail', provider_event_id: msg.id, subject, from: sender.email || sender.name, senderName: sender.name, date, snippet, body, platform, company, text: `${subject} ${fromRaw} ${snippet} ${body} ${company} ${platform}` })
  }
  const timeMin = new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
  const calendar = await providerGet(`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=80&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&q=${encodeURIComponent('interview entretien recruiter hiring recrutement talent visio')}`, accessToken)
  for (const event of (calendar.items || []).slice(0, 80)) {
    const attendees = (event.attendees || []).map(a => a.email).filter(Boolean).join(', ')
    const summary = event.summary || ''
    const description = event.description || ''
    const location = event.location || ''
    if (!eventIsInterview(summary, description, location, attendees)) continue
    const company = extractCompany('', attendees.split(',')[0] || '', summary)
    signals.push({ source: 'calendar', provider_event_id: event.id, subject: summary, from: attendees, date: event.start?.dateTime || event.start?.date || null, snippet: location || description, body: description, location, company, text: `${summary} ${attendees} ${location} ${description} ${company}` })
  }
  return signals
}
async function fetchMicrosoftSignals(accessToken) {
  const signals = []
  const messages = await providerGet('https://graph.microsoft.com/v1.0/me/messages?$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc', accessToken)
  for (const message of (messages.value || []).slice(0, 50)) {
    const subject = message.subject || ''
    if (isNoiseSubject(subject)) continue
    const from = message.from?.emailAddress?.address || message.from?.emailAddress?.name || ''
    const senderName = message.from?.emailAddress?.name || ''
    const snippet = message.bodyPreview || ''
    const body = cleanBody(String(message.body?.content || '').replace(/<[^>]+>/g, ' '))
    const platform = detectPlatform(senderName, from)
    const company = extractCompany(senderName, from, subject)
    signals.push({ source: 'outlook', provider_event_id: message.id, subject, from, senderName, date: message.receivedDateTime || null, snippet, body, platform, company, text: `${subject} ${from} ${snippet} ${body} ${company} ${platform}` })
  }
  const start = new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString()
  const end = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
  const events = await providerGet(`https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=80&$select=id,subject,organizer,attendees,start,location,bodyPreview`, accessToken)
  for (const event of (events.value || []).slice(0, 80)) {
    const people = [event.organizer?.emailAddress?.address, ...(event.attendees || []).map(a => a.emailAddress?.address)].filter(Boolean).join(', ')
    const subject = event.subject || ''
    const location = event.location?.displayName || ''
    const body = event.bodyPreview || ''
    if (!eventIsInterview(subject, body, location, people)) continue
    const company = extractCompany('', people.split(',')[0] || '', subject)
    signals.push({ source: 'ms_calendar', provider_event_id: event.id, subject, from: people, date: event.start?.dateTime || null, snippet: location || body, body, location, company, text: `${subject} ${people} ${location} ${body} ${company}` })
  }
  return signals
}
async function applySignals({ supabase, user, analyses, signals }) {
  const events = []
  const updates = new Map()
  const emails = []
  const calendar = []
  for (const signal of signals) {
    const classification = CALENDAR_SOURCES.has(signal.source)
      ? { status: 'interview', label: 'Interview', eventType: 'interview_scheduled', confidence: 0.9 }
      : classifyStatus(signal.subject, signal.snippet, signal.body)
    if (classification.confidence < 0.58) continue
    const match = matchSignalToAnalysis(signal, analyses)
    const resultItem = EMAIL_SOURCES.has(signal.source)
      ? buildEmailResult(signal, classification, match)
      : buildCalendarResult(signal, classification, match)
    if (EMAIL_SOURCES.has(signal.source)) emails.push(resultItem)
    if (CALENDAR_SOURCES.has(signal.source)) calendar.push(resultItem)
    if (!match.analysis || resultItem.confidence < STORE_EVENT_THRESHOLD) continue
    events.push({
      user_id: user.id,
      analysis_id: match.analysis.id,
      source: signal.source,
      provider_event_id: signal.provider_event_id,
      event_type: classification.eventType,
      detected_status: classification.status,
      confidence: resultItem.confidence,
      subject: clean(signal.subject, 300),
      sender_or_attendees: clean(signal.from, 300),
      event_at: safeIso(signal.date),
      snippet: clean(signal.snippet || signal.body, 500),
      metadata: { auto_detected: true, platform: signal.platform || null, company: signal.company || null, match_reasons: match.reasons || [], ai_summary: resultItem.summary, confidence_label: resultItem.confidenceLabel }
    })
    if (resultItem.confidence >= AUTO_UPDATE_THRESHOLD) {
      const priority = { rejected: 1, sent: 2, applied: 3, interview: 4, offer: 5 }
      const current = updates.get(match.analysis.id)
      if (!current || priority[classification.status] > priority[current.status]) updates.set(match.analysis.id, { status: classification.status })
    }
  }
  if (events.length) await supabase.from('job_tracking_events').upsert(events, { onConflict: 'user_id,source,provider_event_id,analysis_id,event_type' })
  for (const [analysisId, value] of updates.entries()) await supabase.from('analyses').update({ application_status: value.status, status_updated_at: new Date().toISOString() }).eq('id', analysisId).eq('user_id', user.id)
  return { eventsStored: events.length, analysesUpdated: updates.size, emailEvents: emails.length, calendarEvents: calendar.length, emails, calendar }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const supabase = createAdminSupabaseClient()
    if (!supabase) throw new Error('Supabase service role is not configured.')
    const user = await requireUser(req, supabase)
    const { data: connections, error: connError } = await supabase.from('job_sync_connections').select('*').eq('user_id', user.id).eq('status', 'connected').in('provider', ['google', 'microsoft'])
    if (connError || !connections?.length) return res.status(409).json({ error: 'Connect Gmail or Outlook/Hotmail first.', code: 'MAIL_CALENDAR_SYNC_NOT_CONNECTED' })
    const { data: analyses, error: analysesError } = await supabase.from('analyses').select('id,user_id,job_url,job_title,result,application_status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
    if (analysesError) throw analysesError
    let allSignals = []
    for (const connection of connections) {
      const accessToken = await refreshAccessToken(connection, supabase)
      const providerSignals = connection.provider === 'microsoft' ? await fetchMicrosoftSignals(accessToken) : await fetchGoogleSignals(accessToken)
      allSignals = [...allSignals, ...providerSignals]
      await supabase.from('job_sync_connections').update({ last_sync_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('id', connection.id)
    }
    const result = await applySignals({ supabase, user, analyses: analyses || [], signals: allSignals })
    const breakdown = { emailSignals: allSignals.filter(s => EMAIL_SOURCES.has(s.source)).length, calendarSignals: allSignals.filter(s => CALENDAR_SOURCES.has(s.source)).length, emailEvents: result.emailEvents, calendarEvents: result.calendarEvents }
    return res.status(200).json({ success: true, connected: true, providers: connections.map(c => c.provider), scanned: allSignals.length, eventsStored: result.eventsStored, analysesUpdated: result.analysesUpdated, breakdown, emails: result.emails, calendar: result.calendar, thresholds: { storeEvent: STORE_EVENT_THRESHOLD, autoUpdate: AUTO_UPDATE_THRESHOLD } })
  } catch (e) {
    console.error('Smart job sync error:', e)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Smart sync failed.', code: e.code || 'SMART_JOB_SYNC_FAILED' })
  }
}
