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

const previewEmails = [
  { id: 'datadog-rejection', logo: 'datadog', title: 'Datadog — IT Support Manager', status: 'Rejected', statusTone: 'red', source: 'Gmail', from: 'careers@datadog.com', subject: 'Thank you for your application', date: '20 May, 09:12', snippet: 'Thank you for your application. After careful review, we will not be moving forward at this time.', body: 'Hi Roland,\n\nThank you for your application for the IT Support Manager position. After careful review, we have decided not to move forward at this time.\n\nWe appreciate the time you invested and encourage you to apply again for future opportunities that match your experience.\n\nBest regards,\nDatadog Recruiting Team' },
  { id: 'neoen-followup', logo: 'neoen', title: 'Neoen — Infrastructure Support', status: 'Follow-up', statusTone: 'amber', source: 'Gmail', from: 'recruitment@neoen.com', subject: 'Next steps for your application', date: '22 May, 14:45', snippet: 'Recruiter follow-up detected. Please confirm your availability for a short call this week.', body: 'Hello Roland,\n\nThank you for your interest in the Infrastructure Support role. We would like to schedule a short follow-up call to discuss your background and availability.\n\nCould you please confirm a few slots this week?\n\nKind regards,\nNeoen Recruitment' },
  { id: 'summit-confirmation', logo: 'job', title: 'Summit Paris — Business Applications Manager', status: 'Application', statusTone: 'blue', source: 'Gmail', from: 'talent@summitparis.com', subject: 'Application received', date: '23 May, 11:20', snippet: 'Application confirmation detected for Business Applications Manager.', body: 'Hi Roland,\n\nWe have received your application for the Business Applications Manager position. Our team will review your profile and get back to you if your experience matches the role requirements.\n\nThank you,\nSummit Paris Talent Team' }
]

const previewCalendarEvents = [
  { id: 'microsoft-dct', logo: 'microsoft', title: 'Microsoft — Data Center Technician Manager', status: 'Interview', statusTone: 'blue', source: 'Google Calendar', eventTitle: 'Interview with Microsoft recruiter', date: '24 May, 10:30', attendees: 'recruiter@microsoft.com', location: 'Microsoft Teams', detail: 'Interview meeting detected from your calendar.' },
  { id: 'datadog-screen', logo: 'datadog', title: 'Datadog — Enterprise IT Support Manager', status: 'Interview', statusTone: 'blue', source: 'Google Calendar', eventTitle: 'Talent screen — Datadog', date: '26 May, 15:00', attendees: 'recruiting@datadog.com', location: 'Google Meet', detail: 'Recruitment event detected from your calendar.' }
]

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
  const [selectedEmail, setSelectedEmail] = useState(previewEmails[0])

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
        setSyncNotice(t('smart_sync_setup_pending', 'Real email and calendar sync is not connected yet. This preview shows where your emails and agenda interviews will appear once the secure sync backend is finished.'))
        return
      }
      if (!res.ok) throw new Error(data?.error || `Smart sync failed (${res.status})`)
      const breakdown = data.breakdown || {}
      const nextResult = { scanned: data.scanned || 0, eventsStored: data.eventsStored || 0, analysesUpdated: data.analysesUpdated || 0, emailSignals: breakdown.emailSignals || data.emailSignals || 0, calendarSignals: breakdown.calendarSignals || data.calendarSignals || 0, emailEvents: breakdown.emailEvents || data.emailEvents || 0, calendarEvents: breakdown.calendarEvents || data.calendarEvents || 0 }
      setSyncResult(nextResult)
      setSyncTab('emails')
      setSyncMessage(t('smart_sync_complete', { scanned: nextResult.scanned, events: nextResult.eventsStored, updated: nextResult.analysesUpdated }, `Smart Sync complete: ${nextResult.scanned} signals scanned, ${nextResult.eventsStored} events saved, ${nextResult.analysesUpdated} jobs updated.`))
    } catch (e) {
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

  const syncDisplay = {
    scanned: syncResult.scanned || 28,
    emails: syncResult.emailSignals || 6,
    calendar: syncResult.calendarSignals || 2,
    updated: syncResult.analysesUpdated || 4,
    emailEvents: syncResult.emailEvents || 4,
    calendarEvents: syncResult.calendarEvents || 3
  }

  return (
    <div className="messagesPage">
      <main className="messagesShell">
        <section className="smartTrackingPanel syncResultsPanel">
          <div className="smartTrackingIntro">
            <p>{t('smart_sync_kicker', 'Smart Tracking')}</p>
            <h2>{t('smart_sync_title', 'Sync your mail and calendar')}</h2>
          </div>

          <div className="syncResultSummary compactSummary">
            <div className="syncResultTitle"><span className="syncCheck">✓</span><strong>{t('smart_sync_latest_results', 'Latest sync results')}</strong></div>
            <span className="syncResultTime">{t('just_now', 'Just now')} <i /></span>
            <div className="syncMetric"><strong>{syncDisplay.scanned}</strong><span>{t('smart_sync_signals_scanned', 'signals scanned')}</span></div>
            <div className="syncMetric"><strong>{syncDisplay.emails}</strong><span>{t('smart_sync_emails_detected', 'emails detected')}</span></div>
            <div className="syncMetric"><strong>{syncDisplay.calendar}</strong><span>{t('smart_sync_calendar_interviews', 'calendar interviews')}</span></div>
            <div className="syncMetric"><strong>{syncDisplay.updated}</strong><span>{t('smart_sync_jobs_updated', 'jobs updated')}</span></div>
          </div>

          <button type="button" className="runSmartButton syncAgainButton" onClick={runSmartSync} disabled={smartSyncLoading}>
            <span aria-hidden="true">↻</span>{smartSyncLoading ? t('smart_sync_working', 'Working...') : t('smart_sync_run_again', 'Run Smart Sync again')}
          </button>

          <div className="syncTabsCard">
            <div className="syncTabs twoTabs" role="tablist" aria-label="Smart Sync results">
              <button type="button" className={syncTab === 'emails' ? 'is-active' : ''} onClick={() => setSyncTab('emails')}>{t('smart_sync_tab_emails', 'Emails')}</button>
              <button type="button" className={syncTab === 'calendar' ? 'is-active' : ''} onClick={() => setSyncTab('calendar')}>{t('smart_sync_tab_calendar', 'Calendar')}</button>
            </div>

            {syncTab === 'emails' && <div className="syncSplitView">
              <div className="updatedJobsList emailSignalsList">
                {previewEmails.map(email => (
                  <button type="button" className={`updatedJobCard emailSignalCard ${selectedEmail?.id === email.id ? 'is-selected' : ''}`} key={email.id} onClick={() => setSelectedEmail(email)}>
                    <div className={`jobLogo ${email.logo}`} aria-hidden="true"><span /></div>
                    <div className="updatedJobCopy">
                      <strong>{email.title}</strong>
                      <div><span className={`statusPill ${email.statusTone}`}>{email.status}</span><em>✉ {email.source}</em></div>
                      <p>{email.subject} • {email.date}</p>
                    </div>
                    <span className="jobChevron" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>

              <article className="emailPreviewPanel">
                <div className="emailPreviewHead">
                  <span className="emailSourceIcon">✉</span>
                  <div><p>{selectedEmail?.source}</p><h3>{selectedEmail?.subject}</h3><em>{selectedEmail?.from} · {selectedEmail?.date}</em></div>
                </div>
                <div className="emailPreviewBody">
                  {(selectedEmail?.body || '').split('\n').map((line, index) => <p key={`${selectedEmail?.id}-${index}`}>{line || '\u00A0'}</p>)}
                </div>
                <div className="emailPreviewFooter"><span className={`statusPill ${selectedEmail?.statusTone}`}>{selectedEmail?.status}</span><strong>{selectedEmail?.title}</strong></div>
              </article>
            </div>}

            {syncTab === 'calendar' && <div className="updatedJobsList calendarSignalsList">
              {previewCalendarEvents.map(event => (
                <article className="updatedJobCard calendarSignalCard" key={event.id}>
                  <div className={`jobLogo ${event.logo}`} aria-hidden="true"><span /></div>
                  <div className="updatedJobCopy">
                    <strong>{event.title}</strong>
                    <div><span className={`statusPill ${event.statusTone}`}>{event.status}</span><em>▣ {event.source}</em></div>
                    <p>{event.eventTitle} • {event.date}</p>
                    <small>{event.location} · {event.attendees}</small>
                  </div>
                  <span className="jobChevron" aria-hidden="true">›</span>
                </article>
              ))}
            </div>}

            <button type="button" className="moreSignalsRow" onClick={() => setSyncTab(syncTab === 'emails' ? 'calendar' : 'emails')}>
              <span className="signalsIcon" aria-hidden="true">{syncTab === 'emails' ? '▣' : '✉'}</span>
              <span><strong>{syncTab === 'emails' ? t('smart_sync_calendar_found', 'Calendar events found') : t('smart_sync_emails_found', 'Emails found')}</strong><em>{syncTab === 'emails' ? t('smart_sync_calendar_found_body', 'See interviews and recruitment events detected from your agenda.') : t('smart_sync_emails_found_body', 'See emails detected from your inbox.')}</em></span>
              <b>✉ {syncDisplay.emailEvents} {t('smart_sync_emails_short', 'emails')}</b>
              <b>▣ {syncDisplay.calendarEvents} {t('smart_sync_events_short', 'events')}</b>
              <i aria-hidden="true">›</i>
            </button>
          </div>
        </section>

        {syncNotice && <p className="messagesNotice">ℹ {syncNotice}</p>}{error && <p className="messagesError">⚠ {error}</p>}{replySuccess && <p className="messagesSuccess">✓ {replySuccess}</p>}{syncMessage && <p className="messagesSuccess">✓ {syncMessage}</p>}

        <section className="messagesRequestPanel">
          <div className="messagesRequestHero">
            <div><p>{t('messages_kicker', 'Messages')}</p><h1>{t('messages_title', 'Your support conversations')}</h1><span>{t('messages_subtitle', 'Track your submitted requests and future updates from Joblytics support.')}</span></div>
            <a className="messagesHeroButton" href="/contact">{t('messages_new_request', 'New request')}</a>
          </div>

          <div className="messagesGrid"><aside className="messagesList"><div className="messagesListHead"><strong>{t('messages_inbox', 'Inbox')}</strong><span>{threads.length}</span></div>{loading && <p className="messagesMuted">{t('messages_loading', 'Loading messages...')}</p>}{!loading && threads.length === 0 && <div className="messagesEmpty"><strong>{t('messages_empty_title', 'No messages yet')}</strong><p>{t('messages_empty_body', 'When you send a support request, it will appear here.')}</p><a className="messagesEmptyButton" href="/contact">{t('messages_contact_support', 'Contact support')}</a></div>}{threads.map(thread => <button key={thread.id} type="button" className={`messagesThread ${selected?.id === thread.id ? 'is-active' : ''}`} onClick={() => openThread(thread)}><span>{thread.category || 'Support'}</span><strong>{thread.subject || 'Contact request'}</strong><em>{thread.status || 'open'} · {formatDate(thread.last_message_at || thread.created_at)}</em></button>)}</aside><article className="messagesConversation">{!selected && <div className="messagesEmpty conversation"><strong>{t('messages_select_title', 'Select a conversation')}</strong><p>{t('messages_select_body', 'Choose a request from the inbox to see the conversation history.')}</p></div>}{selected && <><div className="messagesConversationHead"><div><p>{selected.category}</p><h2>{selected.subject}</h2><span>{t('messages_status', 'Status')}: {selected.status || 'open'}</span></div></div>{loadingMessages && <p className="messagesMuted">{t('messages_loading_thread', 'Loading conversation...')}</p>}{!loadingMessages && messages.map(message => <div key={message.id} className={`messagesBubble ${message.sender_role === 'admin' ? 'is-admin' : 'is-user'}`}><div><strong>{message.sender_role === 'admin' ? 'Joblytics' : t('messages_you', 'You')}</strong><span>{formatDate(message.created_at)}</span></div><p>{message.body}</p></div>)}<form className="messagesReply" onSubmit={sendReply}><label>{t('messages_reply_label', 'Reply')}</label><textarea value={reply} onChange={event => setReply(event.target.value)} rows={4} placeholder={t('messages_reply_placeholder', 'Write a follow-up message...')} /><button type="submit" disabled={sendingReply || reply.trim().length < 2}>{sendingReply ? t('messages_sending_reply', 'Sending...') : t('messages_send_reply', 'Send reply')}</button></form></>}</article></div>
        </section>
      </main>
    </div>
  )
}
