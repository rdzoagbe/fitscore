import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'admin@joblytics-ai.com'
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'Joblytics <admin@joblytics-ai.com>'
const CONTACT_RATE_LIMIT = Number(process.env.CONTACT_RATE_LIMIT || 5)
const CONTACT_RATE_WINDOW_MINUTES = Number(process.env.CONTACT_RATE_WINDOW_MINUTES || 60)

function clean(value) {
  return String(value || '').trim()
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

function createServerSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function hash(value) {
  if (!value) return null
  const salt = process.env.USAGE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RESEND_API_KEY || 'joblytics-contact'
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex')
}

function getClientIdentity(req, email) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
  const ip = String(forwarded).split(',')[0].trim()
  const userAgent = req.headers['user-agent'] || ''
  return {
    ipHash: hash(ip),
    userAgentHash: hash(userAgent),
    emailHash: hash(clean(email).toLowerCase())
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function getOptionalUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token || !supabase) return null
  const { data } = await supabase.auth.getUser(token)
  return data?.user || null
}

async function enforceContactRateLimit({ supabase, req, user, email }) {
  if (!supabase) return { enforced: false, reason: 'supabase_missing' }
  const identity = getClientIdentity(req, email)
  const since = new Date(Date.now() - CONTACT_RATE_WINDOW_MINUTES * 60 * 1000).toISOString()
  const filters = []
  if (user?.id) filters.push(`user_id.eq.${user.id}`)
  if (identity.emailHash) filters.push(`email_hash.eq.${identity.emailHash}`)
  if (identity.ipHash) filters.push(`ip_hash.eq.${identity.ipHash}`)
  if (!filters.length) return { enforced: false, reason: 'no_identity' }

  const { count, error } = await supabase
    .from('contact_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .or(filters.join(','))

  if (!error && (count || 0) >= CONTACT_RATE_LIMIT) {
    const limitError = new Error(`Too many contact requests. Please wait before sending another message.`)
    limitError.statusCode = 429
    limitError.code = 'CONTACT_RATE_LIMITED'
    throw limitError
  }

  return { enforced: !error, count: count || 0, limit: CONTACT_RATE_LIMIT, windowMinutes: CONTACT_RATE_WINDOW_MINUTES, identity }
}

async function recordContactEvent({ supabase, req, user, email, category, success, providerId, errorCode }) {
  if (!supabase) return
  const identity = getClientIdentity(req, email)
  try {
    await supabase.from('contact_events').insert({
      user_id: user?.id || null,
      email_hash: identity.emailHash,
      ip_hash: identity.ipHash,
      user_agent_hash: identity.userAgentHash,
      category: clean(category) || 'Support',
      success: Boolean(success),
      provider_id: providerId || null,
      error_code: errorCode || null
    })
  } catch {}
}

function buildEmailHtml({ name, email, category, subject, message }) {
  const esc = value => clean(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2>New Joblytics contact request</h2>
      <p><strong>Name:</strong> ${esc(name) || 'Not provided'}</p>
      <p><strong>Email:</strong> ${esc(email) || 'Not provided'}</p>
      <p><strong>Category:</strong> ${esc(category) || 'General'}</p>
      <p><strong>Subject:</strong> ${esc(subject) || 'No subject'}</p>
      <hr />
      <p><strong>Message</strong></p>
      <p style="white-space:pre-wrap">${esc(message) || 'No message provided'}</p>
    </div>`
}

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error('Email sending is not configured yet. Add RESEND_API_KEY in Vercel to send messages directly from Joblytics.')
    error.code = 'EMAIL_PROVIDER_NOT_CONFIGURED'
    error.statusCode = 503
    throw error
  }

  const subject = clean(payload.subject) || `Joblytics contact request - ${clean(payload.category) || 'General'}`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_TO_EMAIL],
      reply_to: clean(payload.email) || undefined,
      subject,
      html: buildEmailHtml(payload)
    })
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Email provider rejected the message.')
    error.code = 'EMAIL_SEND_FAILED'
    error.statusCode = 502
    throw error
  }
  return data
}

async function storeConversation({ supabase, user, payload, emailResult }) {
  if (!supabase || !user) return { stored: false, reason: 'not_authenticated_or_supabase_missing' }
  const subject = clean(payload.subject) || `Contact request - ${clean(payload.category) || 'General'}`
  const { data: thread, error: threadError } = await supabase
    .from('support_threads')
    .insert({ user_id: user.id, user_email: clean(payload.email) || user.email || null, category: clean(payload.category) || 'General', subject, status: 'open', last_message_at: new Date().toISOString(), metadata: { email_provider_id: emailResult?.id || null } })
    .select('id')
    .single()

  if (threadError || !thread?.id) return { stored: false, reason: threadError?.message || 'thread_insert_failed' }

  const { error: messageError } = await supabase
    .from('support_messages')
    .insert({ thread_id: thread.id, user_id: user.id, sender_role: 'user', sender_email: clean(payload.email) || user.email || null, body: clean(payload.message), metadata: { name: clean(payload.name), category: clean(payload.category) } })

  if (messageError) return { stored: false, thread_id: thread.id, reason: messageError.message }
  return { stored: true, thread_id: thread.id }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const supabase = createServerSupabaseClient()
  let normalized = null
  let user = null

  try {
    const payload = req.body || {}
    const name = clean(payload.name)
    const email = clean(payload.email)
    const category = clean(payload.category) || 'Support'
    const subject = clean(payload.subject)
    const message = clean(payload.message)

    if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required.', code: 'EMAIL_REQUIRED' })
    if (message.length < 10) return res.status(400).json({ error: 'Message must be at least 10 characters.', code: 'MESSAGE_TOO_SHORT' })
    if (message.length > 5000) return res.status(400).json({ error: 'Message is too long. Please keep it under 5,000 characters.', code: 'MESSAGE_TOO_LONG' })
    if (/https?:\/\/|www\./i.test(message) && message.match(/https?:\/\/|www\./gi)?.length > 3) return res.status(400).json({ error: 'Too many links in the message.', code: 'TOO_MANY_LINKS' })

    normalized = { name, email, category, subject, message }
    user = await getOptionalUser(req, supabase)
    await enforceContactRateLimit({ supabase, req, user, email })

    const emailResult = await sendEmail(normalized)
    const conversation = await storeConversation({ supabase, user, payload: normalized, emailResult })
    await recordContactEvent({ supabase, req, user, email, category, success: true, providerId: emailResult?.id || null })

    return res.status(200).json({ success: true, email: { sent: true, id: emailResult?.id || null }, conversation })
  } catch (e) {
    console.error('Contact API error:', e)
    if (normalized) await recordContactEvent({ supabase, req, user, email: normalized.email, category: normalized.category, success: false, errorCode: e.code || 'CONTACT_SEND_FAILED' })
    return res.status(e.statusCode || 500).json({ error: e.message || 'Could not send message.', code: e.code || 'CONTACT_SEND_FAILED' })
  }
}