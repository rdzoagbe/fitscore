import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'
import { supabase } from '../lib/supabase'
import './ContactPage.css'

const CONTACT_EMAIL = 'admin@joblytics-ai.com'

async function getFreshAccessToken(session) {
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

export default function ContactPage({ onBack }) {
  const { user, session } = useAuth()
  const { t } = useLang()
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    email: user?.email || '',
    category: 'Support',
    subject: '',
    message: ''
  })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const canSend = form.email.trim().length > 4 && form.message.trim().length >= 10 && !sending

  const update = key => event => {
    setForm(current => ({ ...current, [key]: event.target.value }))
    setError('')
    setSent(false)
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (!canSend) {
      setError(t('contact_required_error', 'Please add your email and a message of at least 10 characters.'))
      return
    }

    setSending(true)
    setError('')
    setSent(false)

    try {
      const token = await getFreshAccessToken(session)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not send message (${res.status})`)
      setSent(true)
      setForm(current => ({ ...current, subject: '', message: '' }))
    } catch (e) {
      setError(e.message || t('contact_send_failed', 'Could not send your message. Please try again.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="contactPage">
      <div className="contactShell">
        <div className="contactTopbar">
          <button type="button" onClick={onBack || (() => window.history.back())}>← {t('back', 'Back')}</button>
          <div><LangSelector /><ThemeToggle /></div>
        </div>

        <section className="contactHero">
          <p>{t('contact_kicker', 'Contact')}</p>
          <h1>{t('contact_title', 'Send your request to Joblytics.')}</h1>
          <span>{t('contact_subtitle_direct', 'Use this form for support, billing, privacy, legal or product questions. Your message is sent directly to Joblytics support and saved in your message area when you are signed in.')}</span>
        </section>

        <section className="contactGrid">
          <form className="contactForm" onSubmit={handleSubmit}>
            <label>
              {t('contact_name', 'Name')}
              <input value={form.name} onChange={update('name')} placeholder="Your name" />
            </label>

            <label>
              {t('contact_email', 'Email')}
              <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
            </label>

            <label>
              {t('contact_category', 'Category')}
              <select value={form.category} onChange={update('category')}>
                <option>Support</option>
                <option>Billing</option>
                <option>Privacy / GDPR</option>
                <option>Legal</option>
                <option>Bug report</option>
                <option>Feature request</option>
                <option>Partnership</option>
              </select>
            </label>

            <label>
              {t('contact_subject', 'Subject')}
              <input value={form.subject} onChange={update('subject')} placeholder="How can we help?" />
            </label>

            <label>
              {t('contact_message', 'Message')}
              <textarea value={form.message} onChange={update('message')} rows={8} placeholder="Write your request here..." required />
            </label>

            {error && <p className="contactError">⚠ {error}</p>}
            {sent && <p className="contactSuccess">✓ {t('contact_sent_direct', 'Message sent. You can follow this request from your Messages area.')}</p>}

            <button type="submit" disabled={!canSend}>{sending ? t('contact_sending', 'Sending...') : t('contact_send', 'Send message')}</button>
          </form>

          <aside className="contactSide">
            <p className="contactKicker">{t('contact_destination', 'Destination')}</p>
            <h2>{CONTACT_EMAIL}</h2>
            <p>{t('contact_direct_note', 'Messages are sent directly from Joblytics once the email provider is configured. Signed-in users also get a saved conversation record for updates.')}</p>
            <div className="contactNote">
              <strong>{t('contact_messages_title', 'Message updates')}</strong>
              <span>{t('contact_messages_body', 'Open Messages from the account menu to see your submitted requests and future support updates.')}</span>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}