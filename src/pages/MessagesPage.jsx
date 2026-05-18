import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import './MessagesPage.css'

function formatDate(value) {
  if (!value) return ''
  try { return new Date(value).toLocaleString() } catch { return value }
}

export default function MessagesPage({ setPage }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [threads, setThreads] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState('')

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

  const openThread = async thread => {
    setSelected(thread)
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

  return (
    <div className="messagesPage">
      <main className="messagesShell">
        <section className="messagesHero">
          <div>
            <p>{t('messages_kicker', 'Messages')}</p>
            <h1>{t('messages_title', 'Your support conversations.')}</h1>
            <span>{t('messages_subtitle', 'Track your submitted requests and future updates from Joblytics support.')}</span>
          </div>
          <button type="button" onClick={() => setPage?.('contact')}>{t('messages_new_request', 'New request')}</button>
        </section>

        {error && <p className="messagesError">⚠ {error}</p>}

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
                <button type="button" onClick={() => setPage?.('contact')}>{t('messages_contact_support', 'Contact support')}</button>
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
              </>
            )}
          </article>
        </section>
      </main>
    </div>
  )
}
