import React, { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'
import './ContactPage.css'

const CONTACT_EMAIL = 'roland.dzoagbe@hotmail.com'

function encodeMailto({ name, email, category, subject, message }) {
  const clean = value => String(value || '').trim()
  const mailSubject = clean(subject) || `Joblytics contact request - ${clean(category) || 'General'}`
  const body = [
    'New Joblytics contact request',
    '',
    `Name: ${clean(name) || 'Not provided'}`,
    `Email: ${clean(email) || 'Not provided'}`,
    `Category: ${clean(category) || 'General'}`,
    `Page: ${typeof window !== 'undefined' ? window.location.href : 'Joblytics'}`,
    '',
    'Message:',
    clean(message) || 'No message provided'
  ].join('\n')

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`
}

export default function ContactPage({ onBack }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    email: user?.email || '',
    category: 'Support',
    subject: '',
    message: ''
  })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const mailto = useMemo(() => encodeMailto(form), [form])
  const canSend = form.email.trim().length > 4 && form.message.trim().length >= 10

  const update = key => event => {
    setForm(current => ({ ...current, [key]: event.target.value }))
    setError('')
    setSent(false)
  }

  const handleSubmit = event => {
    event.preventDefault()
    if (!canSend) {
      setError(t('contact_required_error', 'Please add your email and a message of at least 10 characters.'))
      return
    }
    setSent(true)
    window.location.href = mailto
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
          <span>{t('contact_subtitle', 'Use this form for support, billing, privacy, legal or product questions. Your message will be prepared for email delivery to the Joblytics owner.')}</span>
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
            {sent && <p className="contactSuccess">✓ {t('contact_opening_mail', 'Your email app should open with the message prepared. Please send it from there.')}</p>}

            <button type="submit" disabled={!canSend}>{t('contact_send', 'Send message')}</button>
          </form>

          <aside className="contactSide">
            <p className="contactKicker">{t('contact_destination', 'Destination')}</p>
            <h2>{CONTACT_EMAIL}</h2>
            <p>{t('contact_mailto_note', 'For now, the Send button opens the user’s email app with the request already filled in. This avoids storing extra messages before an email provider is connected.')}</p>
            <div className="contactNote">
              <strong>{t('contact_future_title', 'Future improvement')}</strong>
              <span>{t('contact_future_body', 'Later, connect Resend, Brevo, SendGrid or SMTP so messages are sent directly inside Joblytics without opening the user’s email app.')}</span>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
