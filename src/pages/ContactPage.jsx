import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { trackEvent } from '../utils/analytics'
import './ContactPage.css'

const SUPPORT_EMAIL = 'support@joblytics-ai.com'

const topics = [
  { value: 'bug', label: 'Bug report', icon: '🐞' },
  { value: 'feedback', label: 'Product feedback', icon: '💡' },
  { value: 'account', label: 'Account help', icon: '👤' },
  { value: 'billing', label: 'Billing / limits', icon: '💳' },
  { value: 'partnership', label: 'Partnership', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '✉️' }
]

export default function ContactPage({ onBack }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [topic, setTopic] = useState('feedback')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')

  const isValid = message.trim().length >= 10 && (user?.email || email.trim().includes('@'))

  const send = () => {
    if (!isValid) return
    const selected = topics.find(x => x.value === topic)
    const subject = `[Joblytics] ${selected?.label || topic}`
    const body = [
      `Topic: ${selected?.label || topic}`,
      `Name: ${name || 'Not provided'}`,
      `Email: ${user?.email || email}`,
      `Page: ${window.location.href}`,
      '',
      message.trim()
    ].join('\n')

    trackEvent('contact_started', { topic })
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="contactPro-page">
      <main className="contactPro-shell">
        <section className="contactPro-hero">
          <div>
            <p className="contactPro-kicker">Support</p>
            <h1>Contact Joblytics</h1>
            <p>
              Report a bug, share product feedback, ask for help with your account, or discuss partnerships.
              We use every message to improve the job-search workspace.
            </p>
            <div className="contactPro-actions">
              <button className="contactPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <a className="contactPro-primary" href={`mailto:${SUPPORT_EMAIL}`}>Email support</a>
            </div>
          </div>
          <aside className="contactPro-panel">
            <span>📬</span>
            <h2>We usually reply within 48h.</h2>
            <p>{SUPPORT_EMAIL}</p>
          </aside>
        </section>

        <section className="contactPro-grid">
          <form className="contactPro-card" onSubmit={e => { e.preventDefault(); send() }}>
            <p className="contactPro-kicker">Message</p>
            <h2>Tell us what happened</h2>

            <label className="contactPro-label">Topic</label>
            <div className="contactPro-topics">
              {topics.map(item => (
                <button
                  type="button"
                  key={item.value}
                  className={topic === item.value ? 'is-active' : ''}
                  onClick={() => setTopic(item.value)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="contactPro-fields">
              <div>
                <label className="contactPro-label">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="contactPro-label">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={!!user?.email} />
              </div>
            </div>

            <label className="contactPro-label">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe your issue, idea, or request..."
              rows={8}
              maxLength={2500}
            />
            <p className="contactPro-count">{message.length}/2500</p>

            <button className="contactPro-primary" type="submit" disabled={!isValid}>Send message →</button>
          </form>

          <aside className="contactPro-card contactPro-help">
            <p className="contactPro-kicker">Before sending</p>
            <h2>Helpful details to include</h2>
            <div className="contactPro-helpList">
              <p><strong>Bug:</strong> tell us the page, what you clicked, and the error message.</p>
              <p><strong>Analyze issue:</strong> mention whether you used a URL or pasted the job description.</p>
              <p><strong>CV issue:</strong> mention PDF or Word format and whether the file is text-based.</p>
              <p><strong>Billing/limits:</strong> include the email used to sign in.</p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
