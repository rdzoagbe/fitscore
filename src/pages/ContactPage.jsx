import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getRecentAnalyticsEvents, trackEvent, analyticsEvents } from '../utils/analytics'
import './ContactPage.css'

const SUPPORT_EMAIL = 'support@joblytics-ai.com'

const topics = [
  { value: 'bug', label: 'Bug report', icon: '🐞', priority: 'High', hint: 'Something is broken or not behaving as expected.' },
  { value: 'feedback', label: 'Product feedback', icon: '💡', priority: 'Normal', hint: 'Suggest a product improvement or missing feature.' },
  { value: 'account', label: 'Account help', icon: '👤', priority: 'Medium', hint: 'Login, profile, CV library, or access issue.' },
  { value: 'billing', label: 'Billing / limits', icon: '💳', priority: 'High', hint: 'Plan, usage limit, upgrade, or future billing question.' },
  { value: 'partnership', label: 'Partnership', icon: '🤝', priority: 'Normal', hint: 'Recruiter, school, career coach, or partner request.' },
  { value: 'other', label: 'Other', icon: '✉️', priority: 'Normal', hint: 'Anything else.' }
]

function templateFor(topic) {
  if (topic === 'bug') return 'What happened?\n\nWhat did you expect?\n\nSteps to reproduce:\n1. \n2. \n3. \n\nError message, if any:'
  if (topic === 'billing') return 'What limit or plan question do you have?\n\nCurrent plan shown in the app:\n\nWhat were you trying to do?'
  if (topic === 'account') return 'What account issue are you facing?\n\nEmail used to sign in:\n\nPage where it happened:'
  if (topic === 'partnership') return 'Who are you / your organization?\n\nWhat partnership do you have in mind?\n\nBest way to contact you:'
  return ''
}

function buildDiagnostics() {
  const recentEvents = getRecentAnalyticsEvents()
    .slice(-8)
    .map(event => `${event.ts || ''} — ${event.name || 'event'} — ${event.path || ''}`)
    .join('\n')

  return [
    `Page: ${window.location.href}`,
    `Path: ${window.location.pathname}${window.location.hash}`,
    `Browser language: ${navigator.language}`,
    `Online: ${navigator.onLine ? 'yes' : 'no'}`,
    `Viewport: ${window.innerWidth}x${window.innerHeight}`,
    recentEvents ? `Recent app events:\n${recentEvents}` : ''
  ].filter(Boolean).join('\n')
}

export default function ContactPage({ onBack }) {
  const { user } = useAuth()
  const [topic, setTopic] = useState('feedback')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [opened, setOpened] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    trackEvent(analyticsEvents.CONTACT_OPENED, { source: 'contact_page' })
  }, [])

  const selected = useMemo(() => topics.find(x => x.value === topic) || topics[0], [topic])
  const isValid = message.trim().length >= 10 && (user?.email || email.trim().includes('@'))

  const changeTopic = value => {
    setTopic(value)
    setOpened(false)
    const template = templateFor(value)
    if (!message.trim() && template) setMessage(template)
    trackEvent(analyticsEvents.CONTACT_OPENED, { topic: value })
  }

  const buildMail = () => {
    const subject = `[Joblytics] ${selected.label}`
    const diagnostics = includeDiagnostics ? buildDiagnostics() : ''
    const body = [
      `Topic: ${selected.label}`,
      `Priority: ${selected.priority}`,
      `Name: ${name || 'Not provided'}`,
      `Email: ${user?.email || email}`,
      `Page: ${window.location.href}`,
      '',
      'Message:',
      message.trim(),
      diagnostics ? '\nDiagnostics:' : '',
      diagnostics
    ].filter(Boolean).join('\n')

    return { subject, body }
  }

  const send = () => {
    if (!isValid) return
    const { subject, body } = buildMail()
    trackEvent(analyticsEvents.CONTACT_SUBMITTED, { topic, method: 'mailto', has_diagnostics: includeDiagnostics })
    setOpened(true)
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      trackEvent(analyticsEvents.CONTACT_OPENED, { action: 'copy_email' })
    } catch {
      window.location.href = `mailto:${SUPPORT_EMAIL}`
    }
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
              This Vercel-safe support flow opens your email app instead of adding another serverless function.
            </p>
            <div className="contactPro-actions">
              <button className="contactPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <button className="contactPro-primary" type="button" onClick={copyEmail}>{copied ? 'Copied' : 'Copy support email'}</button>
            </div>
          </div>
          <aside className="contactPro-panel">
            <span>📬</span>
            <h2>Support without extra backend routes.</h2>
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
                <button type="button" key={item.value} className={topic === item.value ? 'is-active' : ''} onClick={() => changeTopic(item.value)}>
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="contactPro-topicHint">{selected.hint} Priority: {selected.priority}.</p>

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
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue, idea, or request..." rows={8} maxLength={2500} />
            <p className="contactPro-count">{message.length}/2500 · minimum 10 characters</p>

            <label className="contactPro-check">
              <input type="checkbox" checked={includeDiagnostics} onChange={e => setIncludeDiagnostics(e.target.checked)} />
              <span>Include page diagnostics in the email draft to help debug faster.</span>
            </label>

            {opened && (
              <div className="contactPro-success">
                <strong>Email draft opened.</strong>
                <span>If your mail app did not open, copy the support email and send the message manually.</span>
              </div>
            )}

            <button className="contactPro-primary" type="submit" disabled={!isValid}>Open email draft →</button>
          </form>

          <aside className="contactPro-card contactPro-help">
            <p className="contactPro-kicker">Before sending</p>
            <h2>Helpful details to include</h2>
            <div className="contactPro-helpList">
              <p><strong>Bug:</strong> page, action clicked, exact error message, and whether it happens again.</p>
              <p><strong>Analyze issue:</strong> say whether you used a URL or pasted the job description.</p>
              <p><strong>CV issue:</strong> mention PDF or Word format and whether the file is text-based.</p>
              <p><strong>Limits:</strong> include the plan shown in the dashboard and your expected remaining usage.</p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
