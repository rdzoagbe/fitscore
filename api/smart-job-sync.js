import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'


// Inlined helper functions for Vercel serverless packaging.
const REFUS_KW = [
  'unfortunately','not moving forward','not selected','not a fit','not the right fit','have decided not','unable to move forward','no longer moving','we regret','after careful consideration','decided to move forward with other','position has been filled','not proceed','not progressing','not shortlisted','unsuccessful','not successful','pas retenu','pas donner suite','regrettons','négative','rejetée','nous ne sommes pas en mesure','ne correspond pas','sans suite',"n'avons pas retenu",'ne donnera pas suite','ne souhaitons pas poursuivre',"n'avons pas pu retenir",'porter notre choix sur','profil ne correspond',"vous informer que votre candidature n'a pas",'décision finale',"avons retenu d'autres",'ne pas retenir',"n'est pas retenue",'retour négatif','réponse négative','malheureusement','nous ne donnerons pas suite','nous ne poursuivrons pas'
]

const ENTRETIEN_KW = [
  'interview','entretien','visio','phone screen','rendez-vous','rendezvous','video call','zoom call','teams meeting','google meet','schedule a call','scheduleonce','calendly','discuter de votre candidature','appel téléphonique','entretien téléphonique','prise de contact','screening','recruiter call','hiring manager','visioconférence','disponibilités','availability'
]

const EN_COURS_KW = [
  'reviewing your application','under review',"en cours d'examen",'à l’étude',"à l'étude",'shortlisted','présélectionné','étudier votre candidature','intéressés par votre profil','souhaitons poursuivre','pleased to inform','next steps','we received your application','nous avons bien reçu','application received','candidature reçue','candidature bien reçue','thank you for applying','merci pour votre candidature','we are pleased','moving forward','présélection','in progress','en cours','being reviewed'
]

const OFFER_KW = [
  'job offer','employment offer','offer letter','offre d’emploi acceptée','offre reçue','proposition d’embauche','proposition de contrat','contrat','contract','compensation package','salary proposal','proposition salariale','promesse d’embauche',"promesse d'embauche"
]

const CALENDAR_INTERVIEW_KW = [
  'interview','entretien','recruit','screening','hr call','hiring','talent','recruiter','visio','appel','candidature','teams','zoom','google meet','meet'
]

const NOISE_SUBJECT_PATTERNS = [
  /^"?information technology/i,/job alert/i,/alerte emploi/i,/offre recommandée/i,/recommended jobs/i,/vos alertes/i,/newsletter/i,/apply now to /i,/reactivate premium/i,/premium today/i,/premium career/i,/uninterrupted access to your linkedin/i,/looking for a new job\?/i,/your \d{4} event recap/i,/mit weekly/i,/business insider/i,/forbes via/i,/le figaro via/i,/agile clinic/i,/genai works/i,/cyber security hub/i,/massachusetts institute/i,/google cloud via/i,/crossover via/i,/agent d'entretien/i,/un poste comme agent/i,/emplois pour paris/i,/recap is ready/i,/impressions last week/i,/posts got \d+/i,/tinder/i,/hot millennial/i,/infrastructure redefined/i,/threat actors/i,/phishing/i,/cancel.*premium/i,/accepted your invitation/i,/just messaged you/i,/is waiting for your response/i,/wanted to connect on linkedin/i
]

const SENDER_PLATFORM_MAP = [
  ['linkedin','LinkedIn'],['apec.fr','APEC'],['apec','APEC'],['hellowork','HelloWork'],['cadremploi','Cadremploi'],['cadreemploi','Cadremploi'],['welcometothejungle','Welcome to the Jungle'],['wttj','Welcome to the Jungle'],['builtin','Built In'],['indeed','Indeed'],['glassdoor','Glassdoor'],['monster','Monster'],['talent.io','Talent.io'],['jobteaser','JobTeaser'],['meteojob','Meteojob'],['regionsjob','RegionsJob'],['francetravail','France Travail'],['france-travail','France Travail'],['pole-emploi','France Travail'],['pole.emploi','France Travail'],['emploipublic','Emploi Public'],['michael page','Michael Page'],['morgan philips','Morgan Philips'],['lhh','LHH'],['greenhouse','Direct (ATS)'],['workable','Direct (ATS)'],['myworkday','Direct (ATS)'],['icims','Direct (ATS)'],['smartrecruiters','Direct (ATS)'],['lever.co','Direct (ATS)'],['amazon.jobs','Amazon Jobs']
]

function clean(value, max = 9999) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

function containsAny(text, keywords) {
  const lower = String(text || '').toLowerCase()
  return keywords.some(keyword => lower.includes(keyword.toLowerCase()))
}

function isNoiseSubject(subject = '') {
  return NOISE_SUBJECT_PATTERNS.some(pattern => pattern.test(subject))
}

const NOISE_SENDER_PATTERNS = [
  /vercel/i,
  /github/i,
  /gitlab/i,
  /bitbucket/i,
  /netlify/i,
  /railway/i,
  /render\.com/i,
  /cloudflare/i,
  /supabase/i,
  /stripe/i,
  /search console/i,
  /sc-noreply@google\.com/i,
  /google search console/i,
  /google webmaster/i,
  /sentry/i,
  /dependabot/i,
  /notifications@/i,
  /offres@alertes/i,
  /alertes\.cadremploi/i,
  /cadremploi.*alerte/i,
  /no-?reply@github/i,
  /noreply@github/i
]

const NOISE_TEXT_PATTERNS = [
  /\bdeploy(?:ment|ed)?\b/i,
  /\bproduction deployment\b/i,
  /\bpreview deployment\b/i,
  /\bbuild failed\b/i,
  /\bbuild succeeded\b/i,
  /\bworkflow run\b/i,
  /\bpull request\b/i,
  /\bcommit\b/i,
  /\bchore:/i,
  /\bfix:/i,
  /\bmerge pull request\b/i,
  /\bbranch\b/i,
  /\brepository\b/i,
  /google search console/i,
  /improve google presence/i,
  /\bjob alert\b/i,
  /\balerte emploi\b/i,
  /\balerte cadremploi\b/i,
  /\b1 offre à ne rater\b/i,
  /\boffres? à ne rater\b/i,
  /\brecommended jobs\b/i,
  /\boffre recommandée\b/i,
  /site ownership/i,
  /domain ownership/i,
  /search performance/i,
  /indexing/i,
  /webmaster/i,
  /verification/i
]

function isNoiseSender(senderName = '', senderEmail = '') {
  const value = `${senderName} ${senderEmail}`
  return NOISE_SENDER_PATTERNS.some(pattern => pattern.test(value))
}

function isNoiseJobText(text = '') {
  return NOISE_TEXT_PATTERNS.some(pattern => pattern.test(String(text || '')))
}

function parseFromHeader(fromValue = '') {
  const raw = String(fromValue || 'Unknown')
  const match = raw.match(/<(.*?)>/)
  if (match) return { name: clean(raw.split('<')[0].replace(/^"|"$/g, ''), 80), email: clean(match[1], 120) }
  return { name: clean(raw.replace(/^"|"$/g, ''), 80), email: clean(raw, 120) }
}

function detectPlatform(senderName = '', senderEmail = '') {
  const combined = `${senderName} ${senderEmail}`.toLowerCase()
  const hit = SENDER_PLATFORM_MAP.find(([keyword]) => combined.includes(keyword))
  return hit ? hit[1] : 'Direct / Other'
}

const STRONG_JOB_SENDER_PATTERNS = [
  /jobs?-noreply@linkedin/i,
  /linkedin.*jobs/i,
  /apec/i,
  /hellowork/i,
  /welcometothejungle/i,
  /wttj/i,
  /cadremploi/i,
  /indeed/i,
  /glassdoor/i,
  /francetravail/i,
  /france-travail/i,
  /workday/i,
  /myworkday/i,
  /greenhouse/i,
  /lever\.co/i,
  /smartrecruiters/i,
  /icims/i,
  /workable/i,
  /ashbyhq/i,
  /teamtailor/i,
  /bamboohr/i,
  /jobs\.ashbyhq/i
]

const APPLICATION_ACTION_PATTERNS = [
  /\byour application\b/i,
  /\bapplication to\b/i,
  /\bapplication for\b/i,
  /\bthank you for applying\b/i,
  /\bwe received your application\b/i,
  /\bapplication received\b/i,
  /\bapplied to\b/i,
  /\bcandidature\b/i,
  /\bmerci pour votre candidature\b/i,
  /\bnous avons bien reçu\b/i,
  /\bvotre candidature\b/i,
  /\bentretien\b/i,
  /\binterview\b/i,
  /\brecruiter\b/i,
  /\brecrutement\b/i,
  /\bhiring\b/i,
  /\boffer\b/i,
  /\boffre\b/i,
  /\brejection\b/i,
  /\bnot selected\b/i,
  /\bnot moving forward\b/i,
  /\bpas retenu\b/i
]

const KNOWN_JOB_COMPANY_PATTERNS = [
  /rodeo fx/i,
  /summit paris/i,
  /sl green/i,
  /capgemini/i,
  /soci[ée]t[ée] g[ée]n[ée]rale/i,
  /societe generale/i,
  /dassault/i,
  /orange business/i,
  /thales/i,
  /bnp paribas/i,
  /l['’]?or[ée]al/i,
  /renault/i,
  /carrefour/i,
  /atos/i
]

function isStrongJobSender(senderName = '', senderEmail = '') {
  const value = `${senderName} ${senderEmail}`
  return STRONG_JOB_SENDER_PATTERNS.some(pattern => pattern.test(value))
}

function isApplicationAction(text = '') {
  return APPLICATION_ACTION_PATTERNS.some(pattern => pattern.test(String(text || '')))
}

function matchesKnownJobCompany(text = '') {
  return KNOWN_JOB_COMPANY_PATTERNS.some(pattern => pattern.test(String(text || '')))
}

function isRealJobSignal({ subject = '', snippet = '', senderName = '', senderEmail = '', platform = '' } = {}) {
  const text = `${subject} ${snippet} ${senderName} ${senderEmail} ${platform}`

  if (isNoiseJobText(text) || isNoiseSubject(subject) || isNoiseSender(senderName, senderEmail)) {
    return false
  }

  const strongSender = isStrongJobSender(senderName, senderEmail)
  const applicationAction = isApplicationAction(text)
  const knownCompany = matchesKnownJobCompany(text)

  // Strict mode: avoid generic inbox pollution.
  // Accept when the email comes from a job platform AND has an application/recruiting action,
  // or when it mentions a known company/application from the user's Job Tracker.
  return (strongSender && applicationAction) || (knownCompany && applicationAction)
}

function classifyStatus(subject = '', snippet = '', body = '') {
  const combined = `${subject} ${snippet} ${body}`.toLowerCase()
  if (containsAny(combined, REFUS_KW)) return { status: 'rejected', label: 'Rejected', eventType: 'rejection', confidence: 0.88 }
  if (containsAny(combined, OFFER_KW)) return { status: 'offer', label: 'Offer', eventType: 'offer_signal', confidence: 0.86 }
  if (containsAny(combined, ENTRETIEN_KW)) return { status: 'interview', label: 'Interview', eventType: 'interview_scheduled', confidence: 0.86 }
  if (containsAny(combined, EN_COURS_KW)) return { status: 'applied', label: 'In progress', eventType: 'application_confirmed', confidence: 0.78 }
  return { status: 'sent', label: 'Sent', eventType: 'application_signal', confidence: 0.58 }
}

function extractCompany(senderName = '', senderEmail = '', subject = '') {
  const cleaned = clean(String(senderName || '').replace(/\b(team|recruiting|careers|no-?reply|support|talent acquisition|talent|hr|jobs?|notifications?)\b/gi, '').replace(/[\-_,]+/g, ' '), 80)
  if (cleaned.length >= 3 && !['notifications','noreply','no reply','gmail','outlook','linkedin'].includes(cleaned.toLowerCase())) return cleaned
  const match = String(subject || '').match(/(?:at|chez)\s+([A-Z][\w&'\- ]{2,40})/)
  if (match) return clean(match[1].replace(/[\-_,]+$/g, ''), 80)
  const domain = String(senderEmail || '').includes('@') ? String(senderEmail).split('@').pop() : senderEmail
  const root = String(domain || '').split('.')[0]
  return root ? root.charAt(0).toUpperCase() + root.slice(1) : 'Unknown'
}

function decodeBase64Url(value = '') {
  try {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized + '='.repeat((4 - normalized.length % 4) % 4), 'base64').toString('utf8')
  } catch { return '' }
}

function extractGmailBody(payload = {}) {
  const mime = payload.mimeType || ''
  const data = payload.body?.data || ''
  if (mime === 'text/plain' && data) return decodeBase64Url(data)
  if (mime === 'text/html' && data) return decodeBase64Url(data).replace(/<[^>]+>/g, ' ')
  const parts = payload.parts || []
  const plain = parts.find(part => part.mimeType === 'text/plain')
  if (plain) {
    const value = extractGmailBody(plain)
    if (value.trim()) return value
  }
  for (const part of parts) {
    const value = extractGmailBody(part)
    if (value.trim()) return value
  }
  return ''
}

function cleanBody(raw = '', maxChars = 2200) {
  const lines = String(raw || '').split(/\r?\n/).map(line => line.trim()).filter(line => {
    if (line.length < 3) return false
    return !/(unsubscribe|se désabonner|click here|cliquez ici|privacy policy|politique de confidentialité|view in browser|voir dans le navigateur)/i.test(line)
  })
  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return body.length > maxChars ? `${body.slice(0, maxChars)}\n[…truncated]` : body
}

function eventIsInterview(summary = '', description = '', location = '', attendees = '') {
  const haystack = `${summary} ${description} ${location} ${attendees}`.toLowerCase()
  return containsAny(haystack, CALENDAR_INTERVIEW_KW)
}

function confidenceLabel(confidence = 0) {
  if (confidence >= 0.82) return 'High confidence'
  if (confidence >= 0.65) return 'Needs confirmation'
  return 'Low confidence'
}

function simpleSummary(signal, classification) {
  const subject = clean(signal.subject || signal.eventTitle || 'Job signal', 140)
  const status = classification?.label || 'Job update'
  const action = classification?.eventType === 'follow_up_needed' ? 'Suggested action: reply or confirm availability.' : classification?.eventType === 'interview_scheduled' ? 'Suggested action: prepare for the interview and verify the calendar time.' : classification?.eventType === 'rejection' ? 'No action required unless you want to follow up.' : 'Suggested action: review the original message.'
  return `${status}: ${subject}. ${action}`
}

function buildGmailQuery(searchAfter = '2025/01/01') {
  const after = String(searchAfter || '2025/01/01').replace(/[^0-9/]/g, '') || '2025/01/01'
  return `after:${after} ("your application" OR "votre candidature" OR "thank you for applying" OR "merci pour votre candidature" OR "application received" OR "candidature reçue" OR entretien OR interview OR "pas retenu" OR unfortunately OR regrettons OR availability OR disponibilités OR "next steps")`
}


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

function monthWindow() {
  // Scan from the first day of the previous month up to now.
  // This matches the product requirement: "last month till date".
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0))

  const yyyy = start.getUTCFullYear()
  const mm = String(start.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(start.getUTCDate()).padStart(2, '0')

  return {
    gmailAfter: `${yyyy}/${mm}/${dd}`,
    isoStart: start.toISOString(),
    isoNow: now.toISOString()
  }
}

function headerDateToTime(value) {
  const t = new Date(value || '').getTime()
  return Number.isFinite(t) ? t : 0
}

function isWithinWindow(dateValue, isoStart, isoNow) {
  const t = headerDateToTime(dateValue)
  return t >= new Date(isoStart).getTime() && t <= new Date(isoNow).getTime()
}

function shouldStopScan(startMs, budgetMs = 7500) {
  return Date.now() - startMs > budgetMs
}

function keyForProvider(provider) {
  const raw = provider === 'microsoft'
    ? (process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY || process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    : (process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!raw) throw new Error(`${provider} token encryption key is not configured.`)
  return crypto.createHash('sha256').update(raw).digest()
}

function openToken(value, provider) {
  const raw = Buffer.from(String(value || ''), 'base64')
  if (raw.length < 29) throw new Error(`${provider} token is missing or incomplete. Reconnect Smart Sync.`)

  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const encrypted = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyForProvider(provider), iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

function sealToken(value, provider) {
  if (!value) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyForProvider(provider), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function tokenExpiresSoon(tokenExpiresAt) {
  if (!tokenExpiresAt) return false
  const expiresAt = new Date(tokenExpiresAt).getTime()
  if (!Number.isFinite(expiresAt)) return true
  return expiresAt - Date.now() < 5 * 60 * 1000
}

function providerOAuthConfig(provider) {
  if (provider === 'microsoft') {
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common'
    return {
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET
    }
  }
  if (provider === 'google') {
    return {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }
  throw new Error(`Unsupported provider for refresh: ${provider}`)
}

async function refreshProviderToken(provider, refreshToken) {
  const config = providerOAuthConfig(provider)
  if (!config.clientId || !config.clientSecret) throw new Error(`${provider} OAuth client is not configured for token refresh.`)
  if (!refreshToken) throw new Error(`${provider} refresh token is missing. Reconnect Smart Sync.`)
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || `${provider} token refresh failed.`)
  return data
}

function isAuthError(message) {
  return /invalid.*(grant|token|client|secret|credential)|unauthorized|revoked|401|403/i.test(String(message || ''))
}

async function updateConnectionError(supabase, connectionId, message) {
  if (!connectionId) return
  const update = { last_error: String(message || 'Smart Sync failed.'), updated_at: new Date().toISOString() }
  if (isAuthError(message)) update.status = 'error'
  await supabase.from('job_sync_connections').update(update).eq('id', connectionId)
}

async function markConnectionSynced(supabase, connectionId) {
  if (!connectionId) return
  const now = new Date().toISOString()
  await supabase.from('job_sync_connections').update({ last_sync_at: now, last_error: null, updated_at: now }).eq('id', connectionId)
}

async function getUsableAccessToken(supabase, connection) {
  const provider = connection.provider
  let accessToken = openToken(connection.access_token_encrypted, provider)
  if (!tokenExpiresSoon(connection.token_expires_at)) return accessToken
  const refreshToken = openToken(connection.refresh_token_encrypted, provider)
  const refreshed = await refreshProviderToken(provider, refreshToken)
  accessToken = refreshed.access_token
  const updatePayload = {
    access_token_encrypted: sealToken(refreshed.access_token, provider),
    token_expires_at: refreshed.expires_in ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null,
    last_error: null,
    updated_at: new Date().toISOString()
  }
  if (refreshed.refresh_token) updatePayload.refresh_token_encrypted = sealToken(refreshed.refresh_token, provider)
  await supabase.from('job_sync_connections').update(updatePayload).eq('id', connection.id)
  return accessToken
}

async function getJson(url, accessToken) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const text = await response.text()
  let data = {}

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error_description || data?.error || `Provider API failed with status ${response.status}`)
  }

  return data
}

function gmailMonthQuery() {
  const { gmailAfter } = monthWindow()
  return `after:${gmailAfter} ("your application" OR "votre candidature" OR "thank you for applying" OR "merci pour votre candidature" OR "application received" OR "candidature reçue" OR entretien OR interview OR "pas retenu" OR unfortunately OR regrettons OR availability OR disponibilités OR "next steps" OR recruiter OR recrutement)`
}

function buildEmail(item) {
  const classification = classifyStatus(item.subject, item.snippet, item.body)

  return {
    id: item.id,
    source: item.source,
    sourceLabel: item.source === 'gmail' ? 'Gmail' : 'Outlook',
    title: clean(`${item.company || 'Detected'} — ${item.subject || 'Job email'}`, 160),
    company: item.company || '',
    status: classification.label,
    detected_status: classification.status,
    eventType: classification.eventType,
    confidence: classification.confidence,
    confidenceLabel: confidenceLabel(classification.confidence),
    platform: item.platform || '',
    subject: item.subject || '',
    from: item.from || '',
    date: item.date || null,
    snippet: item.snippet || '',
    body: item.body || item.snippet || '',
    summary: simpleSummary(item, classification)
  }
}

function buildCalendar(item) {
  const confidence = 0.9

  return {
    id: item.id,
    source: item.source,
    sourceLabel: item.source === 'calendar' ? 'Google Calendar' : 'Microsoft Calendar',
    title: clean(`${item.company || 'Detected'} — ${item.subject || 'Calendar event'}`, 160),
    company: item.company || '',
    status: 'Interview',
    detected_status: 'interview',
    eventType: 'interview_scheduled',
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    eventTitle: item.subject || '',
    subject: item.subject || '',
    date: item.date || null,
    attendees: item.from || '',
    from: item.from || '',
    location: item.location || '',
    snippet: item.snippet || '',
    detail: item.snippet || '',
    summary: simpleSummary({ ...item, eventTitle: item.subject }, { label: 'Interview', eventType: 'interview_scheduled' })
  }
}

async function scanGoogle(accessToken) {
  const emails = []
  const calendar = []
  const errors = []
  const diagnostics = {
    gmailListed: 0,
    gmailFetched: 0,
    gmailNoiseSkipped: 0,
    gmailKeywordSkipped: 0,
    googleCalendarListed: 0,
    googleCalendarKeywordSkipped: 0
  }
  const { isoStart, isoNow } = monthWindow()
  const scanStartedAt = Date.now()

  try {
    // gmail.metadata scope does NOT support the Gmail `q` search parameter.
    // We paginate recent messages and filter by date locally from headers.
    const gmailMessages = []
    let pageToken = ''
    let page = 0

    while (page < 4 && !shouldStopScan(scanStartedAt, 2500)) {
      const list = await getJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
        accessToken
      )

      gmailMessages.push(...(list.messages || []))
      pageToken = list.nextPageToken || ''
      page += 1

      if (!pageToken) break
    }

    diagnostics.gmailListed = gmailMessages.length

    for (const msg of gmailMessages.slice(0, 80)) {
      if (shouldStopScan(scanStartedAt, 7600)) {
        errors.push('gmail-scan: stopped early to avoid timeout; run Smart Sync again to continue.')
        break
      }
      try {
        // gmail.metadata scope: use format=metadata — returns headers + snippet, no body.
        // Subject/From/Date come from headers; snippet (≤200 chars) is enough for classification.
        const detail = await getJson(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          accessToken
        )

        diagnostics.gmailFetched += 1
        const headers = detail.payload?.headers || []
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
        const fromRaw = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || null

        if (!isWithinWindow(date, isoStart, isoNow)) {
          diagnostics.gmailNoiseSkipped += 1
          continue
        }

        const sender = parseFromHeader(fromRaw)
        const snippet = detail.snippet || ''
        const jobSignalText = `${subject} ${snippet}`

        if (
          isNoiseSubject(subject) ||
          isNoiseSender(sender.name, sender.email) ||
          isNoiseJobText(jobSignalText)
        ) {
          diagnostics.gmailNoiseSkipped += 1
          continue
        }
        if (
          !containsAny(jobSignalText, REFUS_KW) &&
          !containsAny(jobSignalText, ENTRETIEN_KW) &&
          !containsAny(jobSignalText, EN_COURS_KW) &&
          !containsAny(jobSignalText, OFFER_KW) &&
          !containsAny(jobSignalText, ['application', 'candidature', 'recruiter', 'recrutement', 'career', 'careers', 'job', 'jobs', 'talent', 'hiring', 'poste', 'opportunité', 'opportunity'])
        ) {
          diagnostics.gmailKeywordSkipped += 1
          continue
        }

        const platform = detectPlatform(sender.name, sender.email)

        if (!isRealJobSignal({
          subject,
          snippet,
          senderName: sender.name,
          senderEmail: sender.email,
          platform
        })) {
          diagnostics.gmailKeywordSkipped += 1
          continue
        }

        const company = extractCompany(sender.name, sender.email, subject)

        emails.push(buildEmail({
          id: msg.id,
          source: 'gmail',
          subject,
          from: sender.email || sender.name,
          date,
          snippet,
          body: snippet, // metadata scope: no body available; snippet is sufficient for classification
          platform,
          company
        }))
      } catch (error) {
        errors.push(`gmail-message: ${error.message}`)
      }
    }
  } catch (error) {
    errors.push(`gmail-list: ${error.message}`)
  }

  try {
    // Fetch all calendar events in the scan window, then filter locally.
    // Do not use Calendar q= here because real interviews may be titled only
    // "Teams meeting", "Google Meet", company name, or recruiter name.
    const events = await getJson(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=120&timeMin=${encodeURIComponent(isoStart)}&timeMax=${encodeURIComponent(isoNow)}`,
      accessToken
    )

    diagnostics.googleCalendarListed = (events.items || []).length

    for (const event of (events.items || [])) {
      const attendees = (event.attendees || []).map(a => a.email).filter(Boolean).join(', ')
      const summary = event.summary || ''
      const description = event.description || ''
      const location = event.location || ''

      const calendarText = `${summary} ${description} ${location} ${attendees}`
      const hasMeetingSignal = /\b(teams|microsoft teams|google meet|meet\.google|zoom|visio|video|call|appel|meeting|réunion|entretien|interview|recruiter|talent|hiring|recrutement|rh|hr)\b/i.test(calendarText)

      if (!eventIsInterview(summary, description, location, attendees) && !matchesKnownJobCompany(calendarText) && !hasMeetingSignal) {
        diagnostics.googleCalendarKeywordSkipped += 1
        continue
      }

      if (
        isNoiseJobText(calendarText) ||
        (!isApplicationAction(calendarText) && !eventIsInterview(summary, description, location, attendees) && !matchesKnownJobCompany(calendarText) && !hasMeetingSignal)
      ) {
        diagnostics.googleCalendarKeywordSkipped += 1
        continue
      }

      const company = extractCompany('', attendees.split(',')[0] || '', summary)
      calendar.push(buildCalendar({
        id: event.id,
        source: 'calendar',
        subject: summary,
        from: attendees,
        date: event.start?.dateTime || event.start?.date || null,
        snippet: location || description,
        location,
        company
      }))
    }
  } catch (error) {
    errors.push(`google-calendar: ${error.message}`)
  }

  return { emails, calendar, errors, diagnostics }
}

function extractRoleTitle(subject = '') {
  const text = clean(subject, 180)

  const patterns = [
    /your application to\s+(.+?)(?:\s+at\s+|$)/i,
    /application to\s+(.+?)(?:\s+at\s+|$)/i,
    /application for\s+(.+?)(?:\s+at\s+|$)/i,
    /candidature(?: au poste de| pour le poste de)?\s+(.+?)(?:\s+chez\s+|$)/i,
    /entretien.*?(?:pour|poste)\s+(.+?)(?:\s+chez\s+|$)/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return clean(match[1].replace(/[-–—]+$/g, ''), 120)
  }

  return ''
}

function normalizeEventDate(value) {
  const t = new Date(value || '').getTime()
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

function toSyncEventRows(userId, provider, emails = [], calendar = []) {
  const emailRows = emails.map(item => ({
    user_id: userId,
    provider,
    source: item.source || 'email',
    external_id: item.id,
    event_type: item.eventType || 'application_signal',
    detected_status: item.detected_status || null,
    status_label: item.status || null,
    company: item.company || null,
    role_title: extractRoleTitle(item.subject || item.title || ''),
    platform: item.platform || null,
    subject: item.subject || item.title || null,
    sender: item.from || null,
    event_date: normalizeEventDate(item.date),
    location: null,
    snippet: item.snippet || null,
    confidence: item.confidence || null,
    confidence_label: item.confidenceLabel || null,
    raw: item
  }))

  const calendarRows = calendar.map(item => ({
    user_id: userId,
    provider,
    source: item.source || 'calendar',
    external_id: item.id,
    event_type: item.eventType || 'interview_scheduled',
    detected_status: item.detected_status || 'interview',
    status_label: item.status || 'Interview',
    company: item.company || null,
    role_title: extractRoleTitle(item.subject || item.eventTitle || ''),
    platform: item.sourceLabel || null,
    subject: item.subject || item.eventTitle || null,
    sender: item.from || item.attendees || null,
    event_date: normalizeEventDate(item.date),
    location: item.location || null,
    snippet: item.snippet || item.detail || null,
    confidence: item.confidence || null,
    confidence_label: item.confidenceLabel || null,
    raw: item
  }))

  return [...emailRows, ...calendarRows].filter(row => row.external_id)
}

async function storeSyncEvents(supabase, userId, provider, emails = [], calendar = []) {
  const rows = toSyncEventRows(userId, provider, emails, calendar)

  if (!rows.length) return { stored: 0, error: null }

  const { error } = await supabase
    .from('job_sync_events')
    .upsert(rows, { onConflict: 'user_id,provider,source,external_id' })

  if (error) return { stored: 0, error }

  return { stored: rows.length, error: null }
}

async function scanMicrosoft(accessToken) {
  const emails = []
  const calendar = []
  const errors = []
  const { isoStart, isoNow } = monthWindow()

  try {
    const filter = encodeURIComponent(`receivedDateTime ge ${isoStart}`)
    const messages = await getJson(
      `https://graph.microsoft.com/v1.0/me/messages?$top=50&$filter=${filter}&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc`,
      accessToken
    )

    for (const message of (messages.value || []).slice(0, 30)) {
      const subject = message.subject || ''
      if (isNoiseSubject(subject)) continue

      const from = message.from?.emailAddress?.address || message.from?.emailAddress?.name || ''
      const senderName = message.from?.emailAddress?.name || ''
      const snippet = message.bodyPreview || ''
      const body = cleanBody(String(message.body?.content || '').replace(/<[^>]+>/g, ' '), 1800)
      const platform = detectPlatform(senderName, from)
      const company = extractCompany(senderName, from, subject)

      emails.push(buildEmail({
        id: message.id,
        source: 'outlook',
        subject,
        from,
        date: message.receivedDateTime || null,
        snippet,
        body,
        platform,
        company
      }))
    }
  } catch (error) {
    errors.push(`microsoft-mail: ${error.message}`)
  }

  try {
    const events = await getJson(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(isoStart)}&endDateTime=${encodeURIComponent(isoNow)}&$top=80&$select=id,subject,organizer,attendees,start,location,bodyPreview`,
      accessToken
    )

    for (const event of (events.value || [])) {
      const people = [
        event.organizer?.emailAddress?.address,
        ...(event.attendees || []).map(a => a.emailAddress?.address)
      ].filter(Boolean).join(', ')

      const subject = event.subject || ''
      const location = event.location?.displayName || ''
      const body = event.bodyPreview || ''

      if (!eventIsInterview(subject, body, location, people)) continue

      const company = extractCompany('', people.split(',')[0] || '', subject)
      calendar.push(buildCalendar({
        id: event.id,
        source: 'ms_calendar',
        subject,
        from: people,
        date: event.start?.dateTime || null,
        snippet: location || body,
        location,
        company
      }))
    }
  } catch (error) {
    errors.push(`microsoft-calendar: ${error.message}`)
  }

  return { emails, calendar, errors }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminSupabaseClient()
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase service role is not configured.' })
    }

    const user = await requireUser(req, supabase)

    const { data: connections, error } = await supabase
      .from('job_sync_connections')
      .select('id,provider,status,provider_email,access_token_encrypted,refresh_token_encrypted,token_expires_at,last_sync_at,last_error,updated_at')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .in('provider', ['google', 'microsoft'])
      .order('updated_at', { ascending: false })

    if (error) {
      return res.status(200).json({
        success: false,
        connected: false,
        error: error.message,
        code: 'SYNC_CONNECTION_READ_FAILED',
        emails: [],
        calendar: [],
        breakdown: { emailSignals: 0, calendarSignals: 0, emailEvents: 0, calendarEvents: 0 }
      })
    }

    if (!connections?.length) {
      return res.status(409).json({
        success: false,
        connected: false,
        error: 'Connect Gmail or Outlook/Hotmail first.',
        code: 'MAIL_CALENDAR_SYNC_NOT_CONNECTED',
        emails: [],
        calendar: [],
        breakdown: { emailSignals: 0, calendarSignals: 0, emailEvents: 0, calendarEvents: 0 }
      })
    }

    let emails = []
    let calendar = []
    let eventsStored = 0
    const errors = []
    const diagnostics = {}

    for (const connection of connections) {
      try {
        const token = await getUsableAccessToken(supabase, connection)
        const scan = connection.provider === 'microsoft' ? await scanMicrosoft(token) : await scanGoogle(token)

        emails = emails.concat(scan.emails)
        calendar = calendar.concat(scan.calendar)
        if (scan.diagnostics) diagnostics[connection.provider] = scan.diagnostics

        const stored = await storeSyncEvents(supabase, user.id, connection.provider, scan.emails, scan.calendar)
        if (stored.error) {
          errors.push(`${connection.provider}: store-events: ${stored.error.message}`)
        } else {
          eventsStored += stored.stored
        }

        if (scan.errors?.length) {
          errors.push(...scan.errors.map(message => `${connection.provider}: ${message}`))
          await updateConnectionError(supabase, connection.id, scan.errors.join(' | '))
        } else {
          await markConnectionSynced(supabase, connection.id)
        }
      } catch (error) {
        const message = `${connection.provider}: ${error.message}`
        errors.push(message)
        await updateConnectionError(supabase, connection.id, error.message)
      }
    }

    const authErrorCount = errors.filter(isAuthError).length
    if (authErrorCount > 0 && authErrorCount >= connections.length) {
      return res.status(200).json({
        success: false,
        connected: false,
        code: 'SYNC_REAUTH_REQUIRED',
        error: 'Your sync connection was revoked. Please reconnect your account.',
        emails: [],
        calendar: [],
        breakdown: { emailSignals: 0, calendarSignals: 0, emailEvents: 0, calendarEvents: 0 }
      })
    }

    return res.status(200).json({
      success: errors.length === 0,
      connected: true,
      providers: connections.map(c => c.provider),
      providerEmails: connections.map(c => ({ provider: c.provider, email: c.provider_email || null })),
      scanned: emails.length + calendar.length,
      eventsStored,
      analysesUpdated: 0,
      breakdown: {
        emailSignals: emails.length,
        calendarSignals: calendar.length,
        emailEvents: emails.length,
        calendarEvents: calendar.length
      },
      emails,
      calendar,
      errors,
      diagnostics,
      monthWindow: monthWindow(),
      message: errors.length
        ? 'Smart Sync scanned from last month through today with warnings.'
        : 'Smart Sync scanned from last month through today successfully.'
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Smart Sync scan failed.',
      code: error.code || 'SMART_SYNC_SCAN_FAILED',
      emails: [],
      calendar: [],
      breakdown: { emailSignals: 0, calendarSignals: 0, emailEvents: 0, calendarEvents: 0 }
    })
  }
}
