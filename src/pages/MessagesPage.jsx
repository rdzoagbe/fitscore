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
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [error, setError] = useState('')
  const [replySuccess, setReplySuccess] = useState('')

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
    if (sync === 'connected') setSyncMessage(t('smart_sync_connected', 'Mail and calendar connected. Run Smart Sync to update your job tracking.'))
    if (sync === 'failed') setError(params.get('reason') || t('smart_sync_failed', 'Mail/calendar sync failed.'))
    if (sync === 'cancelled') setError(t('smart_sync_cancelled', 'Mail/calendar sync was cancelled.'))
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

  const startGoogleSync = async () => {
    setSyncLoading(true)
    setSyncMessage('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('messages_signin_required', 'Please sign in first.'))
      const res = await fetch('/api/google-sync-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not start Google sync (${res.status})`)
      if (!data?.url) throw new Error('Google did not return a connection URL.')
      window.location.href = data.url
    } catch (e) {
      setError(e.message || t('smart_sync_start_failed', 'Could not start mail/calendar sync.'))
      setSyncLoading(false)
    }
  }

  const runSmartSync = async () => {
    setSyncLoading(true)
    setSyncMessage('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('messages_signin_required', 'Please sign in first.'))
      const res = await fetch('/api/smart-job-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({}))
      if (data?.code === 'GOOGLE_SYNC_NOT_CONNECTED') {
        await startGoogleSync()
        return
      }
      if (!res.ok) throw new Error(data?.error || `Smart sync failed (${res.status})`)
      setSyncMessage(t('smart_sync_complete', { scanned: data.scanned, events: data.eventsStored, updated: data.analysesUpdated }, `Smart Sync complete: ${data.scanned} signals scanned, ${data.eventsStored} events saved, ${data.analysesUpdated} jobs updated.`))
    } catch (e) {
      setError(e.message || t('smart_sync_failed', 'Smart sync failed.'))
    } finally {
      setSyncLoading(false)
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
      const res = await fetch('/api/support-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threadId: selected.id, message: body })
      })
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

  return (
    <div className="messagesPage">
      <main className="messagesShell">
        <section className="messagesHero">
          <div>
            <p>{t('messages_kicker', 'Messages')}</p>
            <h1>{t('messages_title', 'Your support conversations.')}</h1>
            <span>{t('messages_subtitle', 'Track your submitted requests and future updates from Joblytics support.')}</span>
          </div>
          <a className="messagesHeroButton" href="/contact">{t('messages_new_request', 'New request')}</a>
        </section>

        <section className="smartSyncCard">
          <div>
            <p>{t('smart_sync_kicker', 'Smart Tracking')}</p>
            <h2>{t('smart_sync_title', 'Sync your mail and calendar')}</h2>
            <span>{t('smart_sync_body', 'Connect Gmail and Calendar read-only so Joblytics can detect application confirmations, recruiter replies, interviews, offers and rejections only for jobs already analyzed in your History.')}</span>
            <ul>
              <li>{t('smart_sync_point_1', 'Only job-related signals connected to analyzed jobs are used.')}</li>
              <li>{t('smart_sync_point_2', 'Full inbox and calendar data are not displayed or stored.')}</li>
              <li>{t('smart_sync_point_3', 'History statuses update automatically: applied, interview, offer or rejected.')}</li>
            </ul>
          </div>
          <div className="smartSyncActions">
            <button type="button" onClick={startGoogleSync} disabled={syncLoading}>{syncLoading ? t('smart_sync_working', 'Working...') : t('smart_sync_connect', 'Sync your mail and calendar')}</button>
            <button type="button" className="secondary" onClick={runSmartSync} disabled={syncLoading}>{t('smart_sync_run', 'Run Smart Sync')}</button>
          </div>
        </section>

        {error && <p className="messagesError">⚠ {error}</p>}
        {replySuccess && <p className="messagesSuccess">✓ {replySuccess}</p>}
        {syncMessage && <p className="messagesSuccess">✓ {syncMessage}</p>}

        <section className="messagesGrid">
          <aside className="messagesList">
            <div className="messagesListHead">
              <strong>{t('messages_inbox', 'Inbox')}</strong>
              <span>{threads.length}</span>
            </div>
            {loading && <p className="messagesMuted">{t('messages_loading', 'Loading messages...')}</p>}
            {!loading && threads.length === 0 && (
              <div className="messagesEmpty">
                <strong>{t('messages_empty_title', 'No messages yet')}</strong>
                <p>{t('messages_empty_body', 'When you send a support request, it will appear here.')}</p>
                <a className="messagesEmptyButton" href="/contact">{t('messages_contact_support', 'Contact support')}</a>
              </div>
            )}
            {threads.map(thread => (
              <button key={thread.id} type="button" className={`messagesThread ${selected?.id === thread.id ? 'is-active' : ''}`} onClick={() => openThread(thread)}>
                <span>{thread.category || 'Support'}</span>
                <strong>{thread.subject || 'Contact request'}</strong>
                <em>{thread.status || 'open'} · {formatDate(thread.last_message_at || thread.created_at)}</em>
              </button>
            ))}
          </aside>

          <article className="messagesConversation">
            {!selected && <div className="messagesEmpty conversation"><strong>{t('messages_select_title', 'Select a conversation')}</strong><p>{t('messages_select_body', 'Choose a request from the left to see the conversation history.')}</p></div>}
            {selected && (
              <>
                <div className="messagesConversationHead">
                  <div>
                    <p>{selected.category}</p>
                    <h2>{selected.subject}</h2>
                    <span>{t('messages_status', 'Status')}: {selected.status || 'open'}</span>
                  </div>
                </div>

                {loadingMessages && <p className="messagesMuted">{t('messages_loading_thread', 'Loading conversation...')}</p>}
                {!loadingMessages && messages.map(message => (
                  <div key={message.id} className={`messagesBubble ${message.sender_role === 'admin' ? 'is-admin' : 'is-user'}`}>
                    <div><strong>{message.sender_role === 'admin' ? 'Joblytics' : t('messages_you', 'You')}</strong><span>{formatDate(message.created_at)}</span></div>
                    <p>{message.body}</p>
                  </div>
                ))}

                <form className="messagesReply" onSubmit={sendReply}>
                  <label>{t('messages_reply_label', 'Reply')}</label>
                  <textarea value={reply} onChange={event => setReply(event.target.value)} rows={4} placeholder={t('messages_reply_placeholder', 'Write a follow-up message...')} />
                  <button type="submit" disabled={sendingReply || reply.trim().length < 2}>{sendingReply ? t('messages_sending_reply', 'Sending...') : t('messages_send_reply', 'Send reply')}</button>
                </form>
              </>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}