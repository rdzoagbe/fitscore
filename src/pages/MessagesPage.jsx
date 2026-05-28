import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import './MessagesPage.css'
import './MessagesPageStable.css'

const URL_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:])/gi
const SMART_SYNC_CACHE_VERSION = 'joblytics-smart-sync-v1'
const SMART_SYNC_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function getSmartSyncCacheKey(userId) {
  return `${SMART_SYNC_CACHE_VERSION}:${userId || 'anonymous'}`
}

function loadSmartSyncCache(userId) {
  try {
    const raw = localStorage.getItem(getSmartSyncCacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const savedAt = parsed?.savedAt ? new Date(parsed.savedAt).getTime() : 0
    if (!savedAt || Date.now() - savedAt > SMART_SYNC_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function saveSmartSyncCache(userId, payload) {
  try {
    localStorage.setItem(getSmartSyncCacheKey(userId), JSON.stringify({ ...payload, savedAt: new Date().toISOString() }))
  } catch {}
}

function formatDate(value) {
  if (!value) return ''
  try { return new Date(value).toLocaleString() } catch { return value }
}

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
}

function cleanLinkLabel(url = '', index = 0) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const jobId = parsed.pathname.match(/\/jobs\/view\/(\d+)/)?.[1]
    if (host.includes('linkedin.com')) {
      if (jobId) return `View LinkedIn job ${jobId}`
      return 'Open LinkedIn link'
    }
    if (host.includes('smartrecruiters.com')) return 'Open application portal'
    if (host.includes('greenhouse.io')) return 'Open Greenhouse application'
    if (host.includes('lever.co')) return 'Open Lever application'
    return `Open ${host}`
  } catch {
    return `Open link ${index + 1}`
  }
}

function isSeparatorLine(line = '') {
  return /^[-–—_\s]{8,}$/.test(String(line || '').trim())
}

function renderLineWithLinks(line = '', keyPrefix = 'line') {
  const decoded = decodeHtml(line)
  const parts = decoded.split(URL_RE)
  let linkIndex = 0
  return parts.map((part, index) => {
    if (!part) return null
    if (/^https?:\/\//i.test(part)) {
      const label = cleanLinkLabel(part, linkIndex)
      linkIndex += 1
      return <a key={`${keyPrefix}-link-${index}`} className="mailReaderLink" href={part} target="_blank" rel="noopener noreferrer">{label}</a>
    }
    return <React.Fragment key={`${keyPrefix}-text-${index}`}>{part}</React.Fragment>
  })
}

function EmailReader({ selected }) {
  const body = decodeHtml(selected?.body || '')
  const lines = body ? body.split(/\r?\n/) : []
  const sender = selected?.from || 'Unknown sender'
  const subject = selected?.subject || selected?.title || 'Email content'

  return (
    <section className="gmailReader">
      <div className="gmailReaderToolbar">
        <span>Email</span>
        <em>{selected?.date || ''}</em>
      </div>

      <div className="gmailReaderHeader">
        <div className="gmailAvatar">{sender.slice(0, 1).toUpperCase()}</div>
        <div>
          <h3>{subject}</h3>
          <p><strong>{sender}</strong> <span>to me</span></p>
        </div>
      </div>

      <div className="gmailReaderBody">
        {lines.length ? lines.map((line, index) => {
          if (isSeparatorLine(line)) return <hr key={`mail-hr-${index}`} />
          const empty = !line.trim()
          return <p key={`mail-line-${index}`} className={empty ? 'is-spacer' : ''}>{empty ? ' ' : renderLineWithLinks(line, `mail-${index}`)}</p>
        }) : <p>No email body was returned for this signal.</p>}
      </div>
    </section>
  )
}

function CalendarInvite({ selected }) {
  const body = decodeHtml(selected?.body || '')
  const lines = body.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const title = selected?.subject || selected?.title || lines[0] || 'Calendar invitation'
  const location = selected?.platform && selected.platform !== 'Calendar' ? selected.platform : ''
  const attendees = selected?.from || ''

  return (
    <section className="calendarInvitePreview">
      <div className="calendarInviteHeader">
        <span>CAL</span>
        <div>
          <p>Calendar invitation</p>
          <h3>{title}</h3>
        </div>
      </div>

      <div className="calendarInviteFacts">
        <div><span>When</span><strong>{selected?.date || 'Not specified'}</strong></div>
        <div><span>Where</span><strong>{location || 'Not specified'}</strong></div>
        <div><span>Attendees</span><strong>{attendees || 'Not specified'}</strong></div>
        <div><span>Status</span><strong>{selected?.type || 'Detected'}</strong></div>
      </div>

      <div className="calendarInviteBody">
        {(lines.length ? lines : [body || 'No invitation description was returned.']).map((line, index) => (
          <p key={`calendar-line-${index}`}>{renderLineWithLinks(line, `calendar-${index}`)}</p>
        ))}
      </div>
    </section>
  )
}

async function getFreshAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

function getAccountEmail(user) {
  const metadata = user?.user_metadata || {}
  const identity = user?.identities?.[0]?.identity_data || {}
  return user?.email || metadata.email || metadata.preferred_username || metadata.upn || identity.email || identity.preferred_username || ''
}

function getSignedInProvider(user) {
  const provider = String(user?.app_metadata?.provider || '').toLowerCase()
  if (provider === 'google') return 'google'
  if (provider === 'azure' || provider === 'microsoft') return 'microsoft'
  return 'google'
}

function getProviderLabel(provider) {
  return provider === 'microsoft' ? 'Outlook / Microsoft Calendar' : 'Gmail / Google Calendar'
}

function getProviderApiLabel(provider) {
  return provider === 'microsoft' ? 'Microsoft' : 'Google'
}

function getSyncType(item = {}) {
  const text = `${item.status || ''} ${item.detected_status || ''} ${item.eventType || ''} ${item.subject || ''} ${item.title || ''} ${item.body || ''} ${item.snippet || ''}`.toLowerCase()
  const sender = String(item.from || item.sender || '').toLowerCase()
  if (text.includes('suggestion') || text.includes('recommended') || sender.includes('match.indeed.com')) return 'Suggestion'
  if (text.includes('reject') || text.includes('refus') || text.includes('unfortunately') || text.includes('malheureusement')) return 'Rejection'
  if (text.includes('interview') || text.includes('entretien') || text.includes('screening')) return 'Interview'
  if (text.includes('follow') || text.includes('availability') || text.includes('disponibilité')) return 'Follow-up'
  if (text.includes('application') || text.includes('candidature')) return 'Application'
  return item.status || item.detected_status || 'Detected'
}

function normalizeEmail(item = {}, index = 0) {
  const company = item.company || item.matchedCompany || ''
  const role = item.role_title || item.roleTitle || item.matchedJobTitle || ''
  return {
    id: item.id || item.provider_event_id || item.external_id || item.subject || `email-${index}`,
    title: item.title || [company, role].filter(Boolean).join(' — ') || item.subject || 'Detected job email',
    subject: item.subject || item.title || 'Job-related email detected',
    type: getSyncType(item),
    from: item.from || item.sender || item.sender_or_attendees || 'Unknown sender',
    date: item.date || item.event_date || item.event_at ? formatDate(item.date || item.event_date || item.event_at) : '',
    company,
    role,
    platform: item.platform || item.source || 'Email',
    body: item.body || item.emailBody || item.snippet || item.summary || item.ai_summary || '',
    confidence: item.confidenceLabel || item.confidence_label || (item.confidence ? `${Math.round(Number(item.confidence) * 100)}% confidence` : 'Detected')
  }
}

function normalizeCalendar(item = {}, index = 0) {
  return {
    id: item.id || item.provider_event_id || item.subject || `calendar-${index}`,
    title: item.title || item.matchedJobTitle || item.company || 'Detected calendar event',
    subject: item.eventTitle || item.subject || 'Recruitment calendar event',
    type: getSyncType(item),
    date: item.date || item.event_at ? formatDate(item.date || item.event_at) : '',
    from: item.attendees || item.sender_or_attendees || '',
    company: item.company || '',
    role: item.matchedJobTitle || '',
    platform: item.location || 'Calendar',
    body: item.detail || item.snippet || '',
    confidence: item.confidenceLabel || 'Detected'
  }
}

function signalTone(type = '') {
  const value = type.toLowerCase()
  if (value.includes('reject')) return 'red'
  if (value.includes('follow')) return 'amber'
  if (value.includes('interview')) return 'blue'
  return 'blue'
}

function Metric({ label, value, text }) {
  return <article className="messagesStableMetric"><p>{label}</p><strong>{value}</strong><span>{text}</span></article>
}

function SignalList({ items, selectedId, onSelect }) {
  if (!items.length) {
    return <div className="messagesStableEmpty"><strong>No detected signals yet</strong><p>Run Smart Sync to detect job-related emails and calendar events.</p></div>
  }
  return (
    <div className="messagesStableSignals">
      {items.map(item => (
        <button key={item.id} type="button" className={`messagesStableSignal ${selectedId === item.id ? 'is-selected' : ''}`} onClick={() => onSelect(item)}>
          <span className={`statusPill ${signalTone(item.type)}`}>{item.type}</span>
          <strong>{item.title}</strong>
          <p>{item.subject}</p>
          <em>{item.date || item.confidence}</em>
        </button>
      ))}
    </div>
  )
}

function SignalDetail({ selected, mode }) {
  if (!selected) {
    return <div className="messagesStableDetailEmpty"><strong>Select a signal</strong><p>Choose an item from the list to review the detected email or calendar event.</p></div>
  }

  const isCalendar = mode === 'calendar'

  return (
    <article className="messagesStableDetail messagesReaderDetail">
      {isCalendar ? <CalendarInvite selected={selected} /> : <EmailReader selected={selected} />}
    </article>
  )
}

export default function MessagesPage({ setPage }) {
  const { user } = useAuth()
  const { t } = useLang()
  const autoRefreshAttempted = useRef(false)
  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [threadError, setThreadError] = useState('')
  const [provider, setProvider] = useState(() => getSignedInProvider(user))
  const [connections, setConnections] = useState(new Set())
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')
  const [syncSuccess, setSyncSuccess] = useState('')
  const [emails, setEmails] = useState([])
  const [calendar, setCalendar] = useState([])
  const [tab, setTab] = useState('emails')
  const [selected, setSelected] = useState(null)
  const [lastSyncAt, setLastSyncAt] = useState('')

  const accountEmail = getAccountEmail(user)
  const providerConnected = connections.has(provider)

  useEffect(() => {
    const next = getSignedInProvider(user)
    setProvider(next)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    const cached = loadSmartSyncCache(user.id)
    if (!cached) return

    const cachedEmails = Array.isArray(cached.emails) ? cached.emails.map(normalizeEmail) : []
    const cachedCalendar = Array.isArray(cached.calendar) ? cached.calendar.map(normalizeCalendar) : []
    const cachedProviders = Array.isArray(cached.providers) ? cached.providers : []

    setEmails(cachedEmails)
    setCalendar(cachedCalendar)
    setTab(cached.tab || (cachedEmails.length ? 'emails' : 'calendar'))
    setLastSyncAt(cached.lastSyncAt || cached.savedAt || '')
    if (cachedProviders.length) setConnections(prev => new Set([...prev, ...cachedProviders]))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setLoadingThreads(true)
    setThreadError('')
    supabase
      .from('support_threads')
      .select('id, subject, category, status, user_email, last_message_at, created_at')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) setThreadError(error.message || 'Could not load support messages.')
        else setThreads(data || [])
      })
      .finally(() => setLoadingThreads(false))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('job_sync_connections')
      .select('provider')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .then(({ data }) => {
        if (data?.length) setConnections(new Set(data.map(item => item.provider)))
      })
  }, [user?.id])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sync = params.get('sync')
    if (sync === 'connected') {
      const connectedProvider = params.get('provider') || provider
      setConnections(prev => new Set([...prev, connectedProvider]))
      setSyncNotice('Account connected. Smart Sync will refresh automatically.')
      autoRefreshAttempted.current = false
    }
    if (sync === 'failed') setSyncNotice(params.get('reason') || 'Smart Sync connection failed.')
    if (sync === 'cancelled') setSyncNotice('Smart Sync connection was cancelled.')
    if (sync) window.history.replaceState({}, '', '/messages')
  }, [provider])

  const allSignals = tab === 'calendar' ? calendar : emails
  const stats = useMemo(() => {
    const combined = [...emails, ...calendar]
    return {
      total: combined.length,
      applications: combined.filter(item => item.type === 'Application').length,
      interviews: combined.filter(item => item.type === 'Interview').length,
      rejections: combined.filter(item => item.type === 'Rejection').length,
      followups: combined.filter(item => item.type === 'Follow-up').length
    }
  }, [emails, calendar])

  useEffect(() => {
    const first = allSignals[0] || null
    setSelected(current => current && allSignals.some(item => item.id === current.id) ? current : first)
  }, [tab, emails, calendar])

  const connectProvider = async () => {
    setSyncLoading(true)
    setSyncNotice('')
    setSyncSuccess('')
    try {
      const token = await getFreshAccessToken()
      if (!token) throw new Error('Please sign in again.')
      const res = await fetch('/api/mail-sync-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, login_hint: accountEmail || undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) throw new Error(data?.error || `Could not start ${getProviderApiLabel(provider)} sync.`)
      window.location.href = data.url
    } catch (error) {
      setSyncNotice(error.message || 'Could not connect your account.')
    } finally {
      setSyncLoading(false)
    }
  }

  const runSmartSync = async ({ silent = false } = {}) => {
    setSyncLoading(true)
    if (!silent) setSyncNotice('')
    if (!silent) setSyncSuccess('')
    try {
      const token = await getFreshAccessToken()
      if (!token) throw new Error('Please sign in again.')
      const res = await fetch('/api/smart-job-sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (data?.code === 'MAIL_CALENDAR_SYNC_NOT_CONNECTED' || data?.code === 'GOOGLE_SYNC_NOT_CONNECTED') {
        setSyncNotice('Connect read-only access first, then run Smart Sync.')
        setConnections(new Set())
        return
      }
      if (!res.ok) throw new Error(data?.error || `Smart Sync failed (${res.status}).`)
      const nextEmails = Array.isArray(data.emails) ? data.emails.map(normalizeEmail) : []
      const nextCalendar = Array.isArray(data.calendar) ? data.calendar.map(normalizeCalendar) : []
      const nextProviders = data.providers?.length ? data.providers : Array.from(connections)
      const nextTab = nextEmails.length ? 'emails' : 'calendar'
      const syncedAt = new Date().toISOString()

      if (nextProviders.length) setConnections(new Set(nextProviders))
      setEmails(nextEmails)
      setCalendar(nextCalendar)
      setTab(nextTab)
      setLastSyncAt(syncedAt)
      saveSmartSyncCache(user?.id, {
        emails: nextEmails,
        calendar: nextCalendar,
        providers: nextProviders,
        tab: nextTab,
        lastSyncAt: syncedAt
      })
      setSyncSuccess(`Smart Sync complete: ${data.scanned || 0} signals scanned, ${data.eventsStored || 0} events saved, ${data.analysesUpdated || 0} jobs updated.`)
    } catch (error) {
      setSyncNotice(error.message || 'Smart Sync could not complete.')
    } finally {
      setSyncLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id || syncLoading || autoRefreshAttempted.current) return
    if (!providerConnected) return
    if (emails.length || calendar.length) return

    autoRefreshAttempted.current = true
    runSmartSync({ silent: true })
  }, [user?.id, providerConnected, emails.length, calendar.length, syncLoading])

  const handlePrimarySync = () => providerConnected ? runSmartSync() : connectProvider()

  return (
    <div className="messagesPage messagesStablePage">
      <main className="messagesShell messagesStableShell">
        <section className="newSyncPanel messagesStableHero">
          <div className="newSyncHeader">
            <p>SMART TRACKING</p>
            <h2>Sync your mail and calendar</h2>
            <span>Connect read-only access, then let Joblytics detect applications, replies, interviews, rejections and follow-ups from job-related emails and calendar events.</span>
          </div>

          <div className="messagesStableConnect">
            <div>
              <p>Connected account</p>
              <h3>{getProviderLabel(provider)}</h3>
              <span>{accountEmail || 'No email detected'}</span>
            </div>
            {!getSignedInProvider(user) && (
              <select value={provider} onChange={event => setProvider(event.target.value)}>
                <option value="google">Gmail / Google Calendar</option>
                <option value="microsoft">Outlook / Microsoft Calendar</option>
              </select>
            )}
            <button type="button" className="newSyncRunBtn messagesStablePrimary" onClick={handlePrimarySync} disabled={syncLoading}>
              {syncLoading ? 'Working…' : providerConnected ? 'Refresh Smart Sync now' : 'Connect & run Smart Sync'}
            </button>
            <em>{providerConnected ? 'Read-only access active' : 'Read-only access needed'} · Last sync: {lastSyncAt ? formatDate(lastSyncAt) : 'Never'}</em>
          </div>

          {syncNotice && <p className="messagesNotice">ℹ {syncNotice}</p>}
          {syncSuccess && <p className="messagesSuccess">✓ {syncSuccess}</p>}
        </section>

        <section className="messagesStableMetrics">
          <Metric label="Tracked signals" value={stats.total} text="Email and calendar events" />
          <Metric label="Applications" value={stats.applications} text="Confirmed applications" />
          <Metric label="Interviews" value={stats.interviews} text="Detected interviews" />
          <Metric label="Rejections" value={stats.rejections} text="Negative replies" />
          <Metric label="Follow-ups" value={stats.followups} text="Potential actions" />
        </section>

        <section className="messagesStableInbox">
          <div className="messagesStableTabs">
            <button type="button" className={tab === 'emails' ? 'is-active' : ''} onClick={() => setTab('emails')}>Emails <span>{emails.length}</span></button>
            <button type="button" className={tab === 'calendar' ? 'is-active' : ''} onClick={() => setTab('calendar')}>Calendar <span>{calendar.length}</span></button>
          </div>
          <div className="messagesStableSplit">
            <SignalList items={allSignals} selectedId={selected?.id} onSelect={setSelected} />
            <SignalDetail selected={selected} mode={tab} />
          </div>
        </section>

        <section className="messagesRequestPanel messagesStableSupport">
          <div className="messagesRequestHero">
            <div>
              <p>{t('messages_kicker', 'Messages')}</p>
              <h1>{t('messages_title', 'Support conversations')}</h1>
              <span>{t('messages_subtitle', 'Track submitted support requests and future Joblytics updates.')}</span>
            </div>
            <button type="button" className="messagesHeroButton" onClick={() => setPage?.('contact')}>{t('messages_new_request', 'New request')}</button>
          </div>

          {threadError && <p className="messagesError">⚠ {threadError}</p>}
          {loadingThreads && <p className="messagesMuted">Loading support conversations…</p>}
          {!loadingThreads && !threads.length && (
            <div className="messagesEmpty">
              <strong>No support conversations yet</strong>
              <p>When you submit a support request, it will appear here.</p>
              <button type="button" onClick={() => setPage?.('contact')}>Contact support</button>
            </div>
          )}
          {!!threads.length && (
            <div className="messagesStableThreadList">
              {threads.map(thread => (
                <article key={thread.id} className="messagesThread">
                  <span>{thread.category || 'Support'}</span>
                  <strong>{thread.subject || 'Support request'}</strong>
                  <em>{thread.status || 'open'} · {formatDate(thread.last_message_at || thread.created_at)}</em>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
