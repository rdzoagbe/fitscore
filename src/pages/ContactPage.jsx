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

function getSupportErrorMessage(error, t) {
  const message = String(error?.message || '')
  const code = String(error?.code || '')
  if (/domain is not verified|resend|EMAIL_SEND_FAILED|EMAIL_DOMAIN_NOT_VERIFIED|EMAIL_PROVIDER_NOT_CONFIGURED/i.test(`${message} ${code}`)) {
    return t('support_email_provider_pending', 'Your support request could not be emailed yet because the Joblytics email domain is still being configured. Please try again later, or contact admin@joblytics-ai.com directly for urgent support.')
  }
  return message || t('contact_send_failed', 'Could not send your message. Please try again.')
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
  const [warning, setWarning] = useState('')

  const canSend = form.email.trim().length > 4 && form.message.trim().length >= 10 && !sending

  const update = key => event => {
    setForm(current => ({ ...current, [key]: event.target.value }))
    setError('')
    setWarning('')
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
    setWarning('')
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
      if (!res.ok) {
        const err = new Error(data?.error || `Could not send message (${res.status})`)
        err.code = data?.code
        throw err
      }
      setSent(true)
      if (data?.warning) setWarning(data.warning)
      setForm(current => ({ ...current, subject: '', message: '', category: 'general' }))
    } catch (e) {
      setError(getSupportErrorMessage(e, t))
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
          <p>{t('support_kicker', 'Support')}</p>
          <h1>{t('support_title', 'Contact support')}</h1>
          <span>{t('support_subtitle', 'Need help with analyses, CV exports, billing, privacy or product issues? Send a support request and we will track it from your Messages area when you are signed in.')}</span>
        </section>

        <section className="contactGrid">
          <form className="contactForm" onSubmit={handleSubmit}>
            <label>{t('contact_name', 'Name')}<input value={form.name} onChange={update('name')} placeholder="Your name" /></label>
            <label>{t('contact_email', 'Email')}<input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required /></label>
            <label>{t('contact_category', 'Category')}<select value={form.category} onChange={update('category')}><option>Support</option><option>Billing</option><option>Privacy / GDPR</option><option>Legal</option><option>Bug report</option><option>Feature request</option><option>Partnership</option></select></label>
            <label>{t('contact_subject', 'Subject')}<input value={form.subject} onChange={update('subject')} placeholder="How can we help?" /></label>
            <label>{t('contact_message', 'Message')}<textarea value={form.message} onChange={update('message')} rows={8} placeholder="Write your request here..." required /></label>

            {error && <p className="contactError">⚠ {error}</p>}
            {warning && !error && <p className="contactWarning">⚠ {warning}</p>}
            {sent && <div className="contactSuccess"><p>✓ {t('support_request_saved', 'Support request submitted. You can follow this request from your Messages area.')}</p><a href="/messages">{t('contact_view_messages', 'View Messages')}</a></div>}

            <button type="submit" disabled={!canSend}>{sending ? t('contact_sending', 'Sending...') : t('support_send', 'Contact support')}</button>
          </form>

          <aside className="contactSide">
            <p className="contactKicker">{t('support_destination', 'Support inbox')}</p>
            <h2>{CONTACT_EMAIL}</h2>
            <p>{t('support_direct_note', 'Support requests are saved to your Joblytics message area when you are signed in. Email delivery is used as an additional notification once the email domain is fully configured.')}</p>
            <div className="contactNote"><strong>{t('contact_messages_title', 'Message updates')}</strong><span>{t('contact_messages_body', 'Open Messages from the navigation bar to see your submitted requests and future support updates.')}</span></div>
          </aside>
        </section>
      </div>
    </div>
  )
}
