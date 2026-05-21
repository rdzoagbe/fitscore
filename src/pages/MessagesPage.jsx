import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import './MessagesPage.css'

function formatDate(value) {
  if (!value) return ''
  try { return new Date(value).toLocaleString() } catch { return value }
}

async function getFreshAccessToken(session) {
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

function emptySyncResult() {
  return { scanned: 0, eventsStored: 0, analysesUpdated: 0, emailSignals: 0, calendarSignals: 0, emailEvents: 0, calendarEvents: 0 }
}

function toneForStatus(value = '') {
  const status = String(value).toLowerCase()
  if (status.includes('reject') || status.includes('refus')) return 'red'
  if (status.includes('follow')) return 'amber'
  return 'blue'
}

function normalizeEmail(item = {}, isPreview = false) {
  return {
    id: item.id || item.provider_event_id || item.subject || `email-${Math.random()}`,
    logo: item.logo || 'job',
    title: item.title || item.matchedJobTitle || item.company || (isPreview ? 'Example job email' : 'Detected job email'),
    status: isPreview ? 'Preview' : (item.status || item.detected_status || 'Email'),
    statusTone: item.statusTone || toneForStatus(item.status || item.detected_status),
    source: item.sourceLabel || item.source || (isPreview ? 'Preview email' : 'Email'),
    from: item.from || item.sender_or_attendees || 'Unknown sender',
    subject: item.subject || 'Job email detected',
    date: formatDate(item.date || item.event_at) || (isPreview ? 'Preview' : ''),
    snippet: item.snippet || '',
    body: item.body || item.emailBody || item.snippet || '',
    summary: item.summary || item.ai_summary || item.aiSummary || '',
    confidenceLabel: isPreview ? 'Preview example' : (item.confidenceLabel || (item.confidence ? `${Math.round(Number(item.confidence) * 100)}% confidence` : 'Detected'))
  }
}

function normalizeCalendar(item = {}, isPreview = false) {
  return {
    id: item.id || item.provider_event_id || item.subject || `calendar-${Math.random()}`,
    logo: item.logo || 'job',
    title: item.title || item.matchedJobTitle || item.company || (isPreview ? 'Example calendar event' : 'Detected calendar event'),
    status: isPreview ? 'Preview' : (item.status || item.detected_status || 'Interview'),
    statusTone: item.statusTone || toneForStatus(item.status || item.detected_status || 'Interview'),
    source: item.sourceLabel || item.source || (isPreview ? 'Preview calendar' : 'Calendar'),
    eventTitle: item.eventTitle || item.subject || 'Recruitment event detected',
    date: formatDate(item.date || item.event_at) || (isPreview ? 'Preview' : ''),
    attendees: item.attendees || item.from || item.sender_or_attendees || '',
    location: item.location || '',
    detail: item.detail || item.snippet || '',
    confidenceLabel: isPreview ? 'Preview example' : (item.confidenceLabel || (item.confidence ? `${Math.round(Number(item.confidence) * 100)}% confidence` : 'Detected'))
  }
}

const previewEmails = [
  normalizeEmail({ id: 'preview-email-1', logo: 'job', title: 'Example — Application update', subject: 'Example: Thank you for your application', from: 'recruiter@example.com', body: 'Preview mode\n\nThis is an example of how Joblytics will display an important job-related email after secure sync is active.\n\nReal emails will show the actual sender, subject, date, content, AI summary and suggested action.', summary: 'Example summary: application update detected. Review the original email before acting.' }, true),
  normalizeEmail({ id: 'preview-email-2', logo: 'job', title: 'Example — Recruiter follow-up', subject: 'Example: Next steps for your application', from: 'careers@example.com', body: 'Preview mode\n\nThis example represents a recruiter follow-up email. In production, Joblytics will summarize the message and highlight whether action is needed.', summary: 'Example summary: recruiter may be asking for availability.' }, true)
]

const previewCalendarEvents = [
  normalizeCalendar({ id: 'preview-calendar-1', logo: 'job', title: 'Example — Interview event', eventTitle: 'Example: Interview with recruiter', location: 'Teams / Meet', attendees: 'recruiter@example.com' }, true),
  normalizeCalendar({ id: 'preview-calendar-2', logo: 'job', title: 'Example — Talent screen', eventTitle: 'Example: Talent screen', location: 'Video call', attendees: 'recruiting@example.com' }, true)
]


function getSignedInProvider(user) {
  const provider = String(user?.app_metadata?.provider || '').toLowerCase()
  if (provider === 'google') return 'google'
  if (provider === 'azure' || provider === 'microsoft') return 'microsoft'
  return null
}

function getAccountEmail(user) {
  const metadata = user?.user_metadata || {}
  const identity = user?.identities?.[0]?.identity_data || {}

  return (
    user?.email ||
    metadata.email ||
    metadata.preferred_username ||
    metadata.upn ||
    metadata.user_name ||
    identity.email ||
    identity.preferred_username ||
    identity.upn ||
    identity.userPrincipalName ||
    ''
  )
}

function getProviderLabel(provider) {
  return provider === 'microsoft' ? 'Microsoft / Outlook' : 'Google'
}

function getProviderProductLabel(provider) {
  return provider === 'microsoft' ? 'Outlook and Microsoft Calendar' : 'Gmail and Google Calendar'
}

function getProviderLogoClass(provider) {
  return provider === 'microsoft' ? 'outlook' : 'gmail'
}

function getProviderButtonIcon(provider) {
  return provider === 'microsoft' ? 'newSyncMsIcon' : 'newSyncGoogleG'
}

export default function MessagesPage({ setPage }) {
  const { user, session } = useAuth()
  const { t } = useLang()
  const [threads, setThreads] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [smartSyncLoading, setSmartSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState(emptySyncResult())
  const [syncMessage, setSyncMessage] = useState('')
  const [error, setError] = useState('')
  const [syncNotice, setSyncNotice] = useState('')
  const [replySuccess, setReplySuccess] = useState('')
  const [syncTab, setSyncTab] = useState('emails')
  const [syncedEmails, setSyncedEmails] = useState([])
  const [syncedCalendar, setSyncedCalendar] = useState([])
  const [selectedEmail, setSelectedEmail] = useState(previewEmails[0])
  const [hasRealSync, setHasRealSync] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('google')
  const [connectedProviders, setConnectedProviders] = useState(new Set())

  useEffect(() => {
    let active = true
    async function loadThreads() {
      if (!user?.id) { setLoading(false); return }
      setLoading(true)
      setError('')
      const { data, error } = await supabase
        .from('support_threads')
        .select('id, subject, category, status, user_email, last_message_at, created_at')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(50)
      if (!active) return
      if (error) setError(error.message || t('messages_load_error', 'Could not load your messages.'))
      else setThreads(data || [])
      setLoading(false)
    }
    loadThreads()
    return () => { active = false }
  }, [user?.id, t])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sync = params.get('sync')
    if (sync === 'connected') {
      const provider = params.get('provider')
      if (provider) setConnectedProviders(prev => new Set([...prev, provider]))
      setSyncNotice(t('smart_sync_connected_notice', 'Account connected. Run Smart Sync to scan your job-related emails and calendar events.'))
    }
    if (sync === 'failed') setSyncNotice(params.get('reason') || t('smart_sync_failed', 'Smart Sync could not complete yet.'))
    if (sync === 'cancelled') setSyncNotice(t('smart_sync_cancelled', 'Smart Sync was cancelled.'))
    if (sync) window.history.replaceState({}, '', '/messages')
  }, [t])

  const openThread = async thread => {
    setSelected(thread)
    setReply('')
    setReplySuccess('')
    setLoadingMessages(true)
    setError('')
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, sender_role, sender_email, body, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
    if (error) setError(error.message || t('messages_thread_error', 'Could not load this conversation.'))
    else setMessages(data || [])
    setLoadingMessages(false)
  }

  const connectMailProvider = async provider => {
    setSmartSyncLoading(true)
    setSyncMessage('')
    setSyncNotice('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('messages_signin_required', 'Please sign in first.'))
      const res = await fetch('/api/mail-sync-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, loginHint: getAccountEmail(user) || undefined })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) throw new Error(data?.error || `Could not start ${provider} sync.`)
      window.location.href = data.url
    } catch (e) {
      setSyncNotice(e.message || t('smart_sync_failed', 'Smart Sync could not complete yet.'))
    } finally {
      setSmartSyncLoading(false)
    }
  }

  const runSmartSync = async () => {
    setSmartSyncLoading(true)
    setSyncMessage('')
    setSyncNotice('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('messages_signin_required', 'Please sign in first.'))
      const res = await fetch('/api/smart-job-sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (data?.code === 'MAIL_CALENDAR_SYNC_NOT_CONNECTED' || data?.code === 'GOOGLE_SYNC_NOT_CONNECTED') {
        setHasRealSync(false)
        setSyncResult(emptySyncResult())
        setSyncNotice(t('smart_sync_setup_pending', 'Connect an account above first, then run Smart Sync.'))
        return
      }
      if (!res.ok) throw new Error(data?.error || `Smart sync failed (${res.status})`)
      const breakdown = data.breakdown || {}
      const emails = Array.isArray(data.emails) ? data.emails.map(item => normalizeEmail(item, false)) : []
      const calendar = Array.isArray(data.calendar) ? data.calendar.map(item => normalizeCalendar(item, false)) : []
      const nextResult = {
        scanned: data.scanned || 0,
        eventsStored: data.eventsStored || 0,
        analysesUpdated: data.analysesUpdated || 0,
        emailSignals: breakdown.emailSignals || data.emailSignals || emails.length || 0,
        calendarSignals: breakdown.calendarSignals || data.calendarSignals || calendar.length || 0,
        emailEvents: breakdown.emailEvents || data.emailEvents || emails.length || 0,
        calendarEvents: breakdown.calendarEvents || data.calendarEvents || calendar.length || 0
      }
      setHasRealSync(true)
      if (data.providers?.length) setConnectedProviders(new Set(data.providers))
      setSyncedEmails(emails)
      setSyncedCalendar(calendar)
      setSelectedEmail(emails[0] || previewEmails[0])
      setSyncResult(nextResult)
      setSyncTab(emails.length ? 'emails' : 'calendar')
      setSyncMessage(t('smart_sync_complete', { scanned: nextResult.scanned, events: nextResult.eventsStored, updated: nextResult.analysesUpdated }, `Smart Sync complete: ${nextResult.scanned} signals scanned, ${nextResult.eventsStored} events saved, ${nextResult.analysesUpdated} jobs updated.`))
    } catch (e) {
      setHasRealSync(false)
      setSyncResult(emptySyncResult())
      setSyncNotice(e.message || t('smart_sync_failed', 'Smart Sync could not complete yet.'))
    } finally {
      setSmartSyncLoading(false)
    }
  }

  const sendReply = async event => {
    event.preventDefault()
    const body = reply.trim()
    if (!selected?.id || body.length < 2) return
    setSendingReply(true)
    setError('')
    setReplySuccess('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('messages_signin_required', 'Please sign in to reply.'))
      const res = await fetch('/api/support-reply', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ threadId: selected.id, message: body }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not send reply (${res.status})`)
      if (data?.message) setMessages(current => [...current, data.message])
      setReply('')
      setReplySuccess(t('messages_reply_sent', 'Reply sent.'))
      setThreads(current => current.map(thread => thread.id === selected.id ? { ...thread, last_message_at: new Date().toISOString(), status: thread.status === 'closed' ? 'open' : thread.status } : thread))
    } catch (e) {
      setError(e.message || t('messages_reply_failed', 'Could not send your reply.'))
    } finally {
      setSendingReply(false)
    }
  }

  const emailItems = hasRealSync ? syncedEmails : previewEmails
  const calendarItems = hasRealSync ? syncedCalendar : previewCalendarEvents
  const syncDisplay = hasRealSync ? {
    scanned: syncResult.scanned,
    emails: syncResult.emailSignals,
    calendar: syncResult.calendarSignals,
    updated: syncResult.analysesUpdated,
    emailEvents: syncResult.emailEvents,
    calendarEvents: syncResult.calendarEvents
  } : { scanned: '—', emails: '—', calendar: '—', updated: '—', emailEvents: '—', calendarEvents: '—' }

  const isGoogleConnected = connectedProviders.has('google')
  const isMsConnected = connectedProviders.has('microsoft')
  const signedInProvider = getSignedInProvider(user)
  const accountEmail = getAccountEmail(user)
  const preferredProvider = signedInProvider || selectedProvider
  const isPreferredConnected = preferredProvider === 'microsoft' ? isMsConnected : isGoogleConnected

  return (
    <div className="messagesPage">
      <main className="messagesShell">

        <section className="newSyncPanel">
          <div className="newSyncHeader">
            <p>SMART TRACKING</p>
            <h2>Sync your mail and calendar</h2>
            <span>Connect your email and calendar with read-only access, then run Smart Sync. Joblytics scans only job-related emails and calendar events linked to jobs already analysed in your History.</span>
          </div>

          <div className="newSyncGrid">
            <div className="newSyncCol">
              <div className="newSyncColHead">
                <span className="newSyncStepNum">1.</span>
                <div>
                  <strong>{signedInProvider ? 'Account connected' : 'Connect your accounts'}</strong>
                  <p>{signedInProvider ? `${getProviderLabel(signedInProvider)} is connected for sign-in. Grant read-only mail and calendar access to activate Smart Sync.` : 'Select your email and calendar provider and approve read-only access.'}</p>
                </div>
              </div>

              {signedInProvider ? (
                <div className="newSyncSsoCard">
                  <div className="newSyncSsoIdentity">
                    <span className={`newSyncServiceLogo ${getProviderLogoClass(signedInProvider)}`} aria-hidden="true" />
                    <div>
                      <strong>{getProviderLabel(signedInProvider)} account connected</strong>
                      <p>{accountEmail || 'Signed in with SSO'}</p>
                      <em>Sign-in is active. Now grant read-only access to {getProviderProductLabel(signedInProvider)} so Joblytics can detect job-related emails and calendar interviews.</em>
                    </div>
                    <span className="newSyncBadge is-connected">Account connected</span>
                  </div>

                  <button
                    type="button"
                    className={`newSyncConnectBtn ${signedInProvider === 'microsoft' ? 'ms' : ''} is-main-action`}
                    onClick={() => isPreferredConnected ? runSmartSync() : connectMailProvider(signedInProvider)}
                    disabled={smartSyncLoading}
                  >
                    <span className={getProviderButtonIcon(signedInProvider)} aria-hidden="true" />
                    {smartSyncLoading ? 'Working…' : isPreferredConnected ? 'Run Smart Sync' : 'Grant read-only mail & calendar access'}
                  </button>

                  <p className="newSyncSsoHint">
                    {isPreferredConnected
                      ? 'Mail and calendar access is active. Run Smart Sync to import job-related signals.'
                      : 'You will be sent directly to the permission screen for the same account you used to sign in.'}
                  </p>
                </div>
              ) : (
                <>
                  <label className="newSyncProviderLabel">CHOOSE YOUR EMAIL/CALENDAR</label>
                  <div className="newSyncDropdownWrap">
                    <span className={`newSyncDropdownIcon ${selectedProvider}`} aria-hidden="true" />
                    <select className="newSyncDropdown" value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                      <option value="google">Gmail / Google Calendar</option>
                      <option value="microsoft">Outlook / Hotmail / Microsoft Calendar</option>
                    </select>
                    <span className="newSyncDropdownChevron" aria-hidden="true">▾</span>
                  </div>

                  <div className="newSyncServicesList">
                    {selectedProvider === 'google' ? <>
                      <div className="newSyncServiceRow">
                        <span className="newSyncServiceLogo gmail" aria-hidden="true" />
                        <div className="newSyncServiceText">
                          <strong>Gmail</strong>
                          <p>Scan job-related emails like confirmations, replies, and offers.</p>
                        </div>
                        <span className={`newSyncBadge${isGoogleConnected ? ' is-connected' : ''}`}>{isGoogleConnected ? 'Connected' : 'Not connected'}</span>
                        <button type="button" className="newSyncConnectBtn" onClick={() => isGoogleConnected ? runSmartSync() : connectMailProvider('google')} disabled={smartSyncLoading}>
                          <span className="newSyncGoogleG" aria-hidden="true" />{isGoogleConnected ? 'Run Smart Sync' : 'Connect'}
                        </button>
                      </div>
                      <div className="newSyncServiceRow">
                        <span className="newSyncServiceLogo gcal" aria-hidden="true" />
                        <div className="newSyncServiceText">
                          <strong>Google Calendar</strong>
                          <p>Scan interview meetings and recruitment events.</p>
                        </div>
                        <span className={`newSyncBadge${isGoogleConnected ? ' is-connected' : ''}`}>{isGoogleConnected ? 'Connected' : 'Not connected'}</span>
                        <button type="button" className="newSyncConnectBtn" onClick={() => isGoogleConnected ? runSmartSync() : connectMailProvider('google')} disabled={smartSyncLoading}>
                          <span className="newSyncGoogleG" aria-hidden="true" />{isGoogleConnected ? 'Run Smart Sync' : 'Connect'}
                        </button>
                      </div>
                    </> : <>
                      <div className="newSyncServiceRow">
                        <span className="newSyncServiceLogo outlook" aria-hidden="true" />
                        <div className="newSyncServiceText">
                          <strong>Outlook</strong>
                          <p>Scan job-related emails like confirmations, replies, and offers.</p>
                        </div>
                        <span className={`newSyncBadge${isMsConnected ? ' is-connected' : ''}`}>{isMsConnected ? 'Connected' : 'Not connected'}</span>
                        <button type="button" className="newSyncConnectBtn ms" onClick={() => isMsConnected ? runSmartSync() : connectMailProvider('microsoft')} disabled={smartSyncLoading}>
                          <span className="newSyncMsIcon" aria-hidden="true" />{isMsConnected ? 'Run Smart Sync' : 'Connect'}
                        </button>
                      </div>
                      <div className="newSyncServiceRow">
                        <span className="newSyncServiceLogo mscal" aria-hidden="true" />
                        <div className="newSyncServiceText">
                          <strong>Microsoft Calendar</strong>
                          <p>Scan interview meetings and recruitment events.</p>
                        </div>
                        <span className={`newSyncBadge${isMsConnected ? ' is-connected' : ''}`}>{isMsConnected ? 'Connected' : 'Not connected'}</span>
                        <button type="button" className="newSyncConnectBtn ms" onClick={() => isMsConnected ? runSmartSync() : connectMailProvider('microsoft')} disabled={smartSyncLoading}>
                          <span className="newSyncMsIcon" aria-hidden="true" />{isMsConnected ? 'Run Smart Sync' : 'Connect'}
                        </button>
                      </div>
                    </>}
                  </div>
                </>
              )}

              <button type="button" className="newSyncRunBtn is-inline" onClick={runSmartSync} disabled={smartSyncLoading}>
                <span aria-hidden="true">↻</span>
                {smartSyncLoading ? 'Working…' : 'Run Smart Sync Now'}
              </button>

              <p className="newSyncLastSync is-inline">
                <span aria-hidden="true">🕐</span> Last sync: {hasRealSync ? 'Just now' : 'Never'}
              </p>

              <div className="newSyncPrivacy">
                <span aria-hidden="true">🛡</span>
                <p>Your privacy is our priority. We use read-only access and never modify, send, or store your email or calendar data.</p>
              </div>
            </div>


          </div>

          <div className="newSyncDetects">
            <strong>What gets detected?</strong>
            <div className="newSyncDetectsGrid">
              <div className="newSyncDetectCard">
                <div className="newSyncDetectIcon email" aria-hidden="true">✉</div>
                <div>
                  <strong>Email signals</strong>
                  <p>Application confirmations, recruiter replies, rejections, offers, and follow-up emails detected after sync.</p>
                </div>
              </div>
              <div className="newSyncDetectCard">
                <div className="newSyncDetectIcon cal" aria-hidden="true">▣</div>
                <div>
                  <strong>Calendar signals</strong>
                  <p>Interview meetings and recruitment events detected from your connected calendar.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="newSyncTip">
            <span aria-hidden="true">💡</span>
            <p><strong>Tip:</strong> Keep Smart Sync enabled to let Joblytics automatically detect and track your job applications, interviews, offers, rejections, and follow-ups in real time.</p>
          </div>

          {hasRealSync && (
            <div className="newSyncResults">
              <div className="syncTabsCard">
                <div className="syncTabs twoTabs" role="tablist" aria-label="Smart Sync results">
                  <button type="button" className={syncTab === 'emails' ? 'is-active' : ''} onClick={() => setSyncTab('emails')}>{t('smart_sync_tab_emails', 'Emails')}</button>
                  <button type="button" className={syncTab === 'calendar' ? 'is-active' : ''} onClick={() => setSyncTab('calendar')}>{t('smart_sync_tab_calendar', 'Calendar')}</button>
                </div>
                {syncTab === 'emails' && (
                  <div className="syncSplitView">
                    <div className="updatedJobsList emailSignalsList">
                      {emailItems.map(email => (
                        <button type="button" className={`updatedJobCard emailSignalCard${selectedEmail?.id === email.id ? ' is-selected' : ''}`} key={email.id} onClick={() => setSelectedEmail(email)}>
                          <div className={`jobLogo ${email.logo}`} aria-hidden="true"><span /></div>
                          <div className="updatedJobCopy">
                            <strong>{email.title}</strong>
                            <div><span className={`statusPill ${email.statusTone}`}>{email.status}</span><em>✉ {email.source}</em></div>
                            <p>{email.subject} • {email.date}</p>
                            <small>{email.confidenceLabel}</small>
                          </div>
                          <span className="jobChevron" aria-hidden="true">›</span>
                        </button>
                      ))}
                    </div>
                    <article className="emailPreviewPanel">
                      <div className="emailPreviewHead">
                        <span className="emailSourceIcon">✉</span>
                        <div>
                          <p>{selectedEmail?.source}</p>
                          <h3>{selectedEmail?.subject}</h3>
                          <em>{selectedEmail?.from} · {selectedEmail?.date}</em>
                        </div>
                      </div>
                      {selectedEmail?.summary && (
                        <div className="emailAiSummary">
                          <strong>AI summary</strong>
                          <p>{selectedEmail.summary}</p>
                          <span>{selectedEmail.confidenceLabel}</span>
                        </div>
                      )}
                      <div className="emailPreviewBody">
                        {(selectedEmail?.body || selectedEmail?.snippet || '').split('\n').map((line, index) => (
                          <p key={`${selectedEmail?.id}-${index}`}>{line || ' '}</p>
                        ))}
                      </div>
                      <div className="emailPreviewFooter">
                        <span className={`statusPill ${selectedEmail?.statusTone}`}>{selectedEmail?.status}</span>
                        <strong>{selectedEmail?.title}</strong>
                      </div>
                    </article>
                  </div>
                )}
                {syncTab === 'calendar' && (
                  <div className="updatedJobsList calendarSignalsList">
                    {calendarItems.map(event => (
                      <article className="updatedJobCard calendarSignalCard" key={event.id}>
                        <div className={`jobLogo ${event.logo}`} aria-hidden="true"><span /></div>
                        <div className="updatedJobCopy">
                          <strong>{event.title}</strong>
                          <div><span className={`statusPill ${event.statusTone}`}>{event.status}</span><em>▣ {event.source}</em></div>
                          <p>{event.eventTitle} • {event.date}</p>
                          <small>{event.location} · {event.attendees} · {event.confidenceLabel}</small>
                        </div>
                        <span className="jobChevron" aria-hidden="true">›</span>
                      </article>
                    ))}
                  </div>
                )}
                <button type="button" className="moreSignalsRow" onClick={() => setSyncTab(syncTab === 'emails' ? 'calendar' : 'emails')}>
                  <span className="signalsIcon" aria-hidden="true">{syncTab === 'emails' ? '▣' : '✉'}</span>
                  <span>
                    <strong>{syncTab === 'emails' ? t('smart_sync_calendar_found', 'Calendar events found') : t('smart_sync_emails_found', 'Emails found')}</strong>
                    <em>{syncTab === 'emails' ? t('smart_sync_calendar_found_body', 'See interviews and recruitment events detected from your agenda.') : t('smart_sync_emails_found_body', 'See emails detected from your inbox.')}</em>
                  </span>
                  <b>✉ {syncDisplay.emailEvents} {t('smart_sync_emails_short', 'emails')}</b>
                  <b>▣ {syncDisplay.calendarEvents} {t('smart_sync_events_short', 'events')}</b>
                  <i aria-hidden="true">›</i>
                </button>
              </div>
            </div>
          )}
        </section>

        {syncNotice && <p className="messagesNotice">ℹ {syncNotice}</p>}
        {error && <p className="messagesError">⚠ {error}</p>}
        {replySuccess && <p className="messagesSuccess">✓ {replySuccess}</p>}
        {syncMessage && <p className="messagesSuccess">✓ {syncMessage}</p>}

        <section className="messagesRequestPanel"><div className="messagesRequestHero"><div><p>{t('messages_kicker', 'Messages')}</p><h1>{t('messages_title', 'Your support conversations')}</h1><span>{t('messages_subtitle', 'Track your submitted requests and future updates from Joblytics support.')}</span></div><a className="messagesHeroButton" href="/contact">{t('messages_new_request', 'New request')}</a></div><div className="messagesGrid"><aside className="messagesList"><div className="messagesListHead"><strong>{t('messages_inbox', 'Inbox')}</strong><span>{threads.length}</span></div>{loading && <p className="messagesMuted">{t('messages_loading', 'Loading messages...')}</p>}{!loading && threads.length === 0 && <div className="messagesEmpty"><strong>{t('messages_empty_title', 'No messages yet')}</strong><p>{t('messages_empty_body', 'When you send a support request, it will appear here.')}</p><a className="messagesEmptyButton" href="/contact">{t('messages_contact_support', 'Contact support')}</a></div>}{threads.map(thread => <button key={thread.id} type="button" className={`messagesThread ${selected?.id === thread.id ? 'is-active' : ''}`} onClick={() => openThread(thread)}><span>{thread.category || 'Support'}</span><strong>{thread.subject || 'Contact request'}</strong><em>{thread.status || 'open'} · {formatDate(thread.last_message_at || thread.created_at)}</em></button>)}</aside><article className="messagesConversation">{!selected && <div className="messagesEmpty conversation"><strong>{t('messages_select_title', 'Select a conversation')}</strong><p>{t('messages_select_body', 'Choose a request from the inbox to see the conversation history.')}</p></div>}{selected && <><div className="messagesConversationHead"><div><p>{selected.category}</p><h2>{selected.subject}</h2><span>{t('messages_status', 'Status')}: {selected.status || 'open'}</span></div></div>{loadingMessages && <p className="messagesMuted">{t('messages_loading_thread', 'Loading conversation...')}</p>}{!loadingMessages && messages.map(message => <div key={message.id} className={`messagesBubble ${message.sender_role === 'admin' ? 'is-admin' : 'is-user'}`}><div><strong>{message.sender_role === 'admin' ? 'Joblytics' : t('messages_you', 'You')}</strong><span>{formatDate(message.created_at)}</span></div><p>{message.body}</p></div>)}<form className="messagesReply" onSubmit={sendReply}><label>{t('messages_reply_label', 'Reply')}</label><textarea value={reply} onChange={event => setReply(event.target.value)} rows={4} placeholder={t('messages_reply_placeholder', 'Write a follow-up message...')} /><button type="submit" disabled={sendingReply || reply.trim().length < 2}>{sendingReply ? t('messages_sending_reply', 'Sending...') : t('messages_send_reply', 'Send reply')}</button></form></>}</article></div></section>
      </main>
    </div>
  )
}
