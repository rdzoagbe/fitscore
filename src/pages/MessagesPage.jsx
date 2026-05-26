import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import './MessagesPage.css'

function formatDate(value) {
  if (!value) return ''
  try { return new Date(value).toLocaleString() } catch { return value }
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
    date: formatDate(item.date || item.event_date || item.event_at),
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
    date: formatDate(item.date || item.event_at),
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

function SignalDetail({ selected }) {
  if (!selected) {
    return <div className="messagesStableDetailEmpty"><strong>Select a signal</strong><p>Choose an item from the list to review the detected email or calendar event.</p></div>
  }
  return (
    <article className="messagesStableDetail">
      <div className="messagesStableDetailHead">
        <p>{selected.platform}</p>
        <h2>{selected.subject}</h2>
        <span>{selected.from} {selected.date ? `· ${selected.date}` : ''}</span>
      </div>
      <dl className="messagesStableFacts">
        <div><dt>Company</dt><dd>{selected.company || 'Not detected'}</dd></div>
        <div><dt>Role</dt><dd>{selected.role || 'Not detected'}</dd></div>
        <div><dt>Status</dt><dd>{selected.type}</dd></div>
        <div><dt>Confidence</dt><dd>{selected.confidence}</dd></div>
      </dl>
      <div className="messagesStableBody">
        <strong>Message preview</strong>
        <p>{selected.body || 'No preview text was returned for this signal.'}</p>
      </div>
    </article>
  )
}

export default function MessagesPage({ setPage }) {
  const { user } = useAuth()
  const { t } = useLang()
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
      setSyncNotice('Account connected. Run Smart Sync to refresh your job signals.')
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

  const runSmartSync = async () => {
    setSyncLoading(true)
    setSyncNotice('')
    setSyncSuccess('')
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
      if (data.providers?.length) setConnections(new Set(data.providers))
      setEmails(nextEmails)
      setCalendar(nextCalendar)
      setTab(nextEmails.length ? 'emails' : 'calendar')
      setLastSyncAt(new Date().toISOString())
      setSyncSuccess(`Smart Sync complete: ${data.scanned || 0} signals scanned, ${data.eventsStored || 0} events saved, ${data.analysesUpdated || 0} jobs updated.`)
    } catch (error) {
      setSyncNotice(error.message || 'Smart Sync could not complete.')
    } finally {
      setSyncLoading(false)
    }
  }

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
            <SignalDetail selected={selected} />
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
