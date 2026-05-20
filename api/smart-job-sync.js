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
  const now = new Date()
  const start = new Date(now)
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)

  const yyyy = start.getUTCFullYear()
  const mm = String(start.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(start.getUTCDate()).padStart(2, '0')

  return {
    gmailAfter: `${yyyy}/${mm}/${dd}`,
    isoStart: start.toISOString(),
    isoNow: now.toISOString()
  }
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
  const { isoStart, isoNow } = monthWindow()

  try {
    const list = await getJson(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(gmailMonthQuery())}`,
      accessToken
    )

    for (const msg of (list.messages || []).slice(0, 25)) {
      try {
        const detail = await getJson(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          accessToken
        )

        const headers = detail.payload?.headers || []
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
        if (isNoiseSubject(subject)) continue

        const fromRaw = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
        const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || null
        const sender = parseFromHeader(fromRaw)
        const snippet = detail.snippet || ''
        const body = cleanBody(extractGmailBody(detail.payload), 1800)
        const platform = detectPlatform(sender.name, sender.email)
        const company = extractCompany(sender.name, sender.email, subject)

        emails.push(buildEmail({
          id: msg.id,
          source: 'gmail',
          subject,
          from: sender.email || sender.name,
          date,
          snippet,
          body,
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
    const events = await getJson(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=80&timeMin=${encodeURIComponent(isoStart)}&timeMax=${encodeURIComponent(isoNow)}&q=${encodeURIComponent('interview entretien recruiter hiring recrutement talent visio')}`,
      accessToken
    )

    for (const event of (events.items || [])) {
      const attendees = (event.attendees || []).map(a => a.email).filter(Boolean).join(', ')
      const summary = event.summary || ''
      const description = event.description || ''
      const location = event.location || ''

      if (!eventIsInterview(summary, description, location, attendees)) continue

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

  return { emails, calendar, errors }
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
      .select('provider,status,provider_email,access_token_encrypted,last_sync_at,last_error,updated_at')
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
    const errors = []

    for (const connection of connections) {
      try {
        const token = openToken(connection.access_token_encrypted, connection.provider)
        const scan = connection.provider === 'microsoft' ? await scanMicrosoft(token) : await scanGoogle(token)
        emails = emails.concat(scan.emails)
        calendar = calendar.concat(scan.calendar)
        errors.push(...scan.errors)
      } catch (error) {
        errors.push(`${connection.provider}: ${error.message}`)
      }
    }

    return res.status(200).json({
      success: errors.length === 0,
      connected: true,
      providers: connections.map(c => c.provider),
      scanned: emails.length + calendar.length,
      eventsStored: 0,
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
      monthWindow: monthWindow(),
      message: errors.length
        ? 'Smart Sync scanned the current month with warnings.'
        : 'Smart Sync scanned the current month successfully.'
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
