import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './LeadCaptureForm.css'

const GOALS = [
  'Improve my CV before applying',
  'Get more interviews',
  'Track my applications',
  'Prepare for interviews',
  'Know when checkout is available'
]

const MARKETS = ['France', 'United Kingdom', 'Europe', 'United States / Canada', 'Other']

function getSourcePage() {
  if (typeof window === 'undefined') return 'unknown'
  return `${window.location.pathname}${window.location.search || ''}`
}

export default function LeadCaptureForm({
  title = 'Get your application readiness checklist',
  description = 'Join the early access list and receive product updates, practical application tips, and examples of how to improve your CV before applying.',
  sourceLabel = 'public_lead_capture',
  compact = false,
  defaultGoal = 'Improve my CV before applying'
}) {
  const [form, setForm] = useState({
    email: '',
    targetRole: '',
    goal: defaultGoal,
    market: 'France',
    notes: '',
    website: '',
    consent: true
  })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const emailLooksValid = useMemo(() => /\S+@\S+\.\S+/.test(form.email.trim()), [form.email])

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const submit = async event => {
    event.preventDefault()
    setMessage('')

    if (form.website) {
      setStatus('success')
      setMessage('Thanks. You are on the list.')
      return
    }

    if (!emailLooksValid) {
      setStatus('error')
      setMessage('Enter a valid email address first.')
      return
    }

    if (!form.consent) {
      setStatus('error')
      setMessage('Please confirm you want to receive Joblytics updates.')
      return
    }

    setStatus('loading')

    const payload = {
      email: form.email.trim().toLowerCase(),
      target_role: form.targetRole.trim() || null,
      job_search_goal: form.goal,
      target_market: form.market,
      notes: form.notes.trim() || null,
      source_page: getSourcePage(),
      source_label: sourceLabel,
      marketing_opt_in: Boolean(form.consent),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null
    }

    const { error } = await supabase
      .from('marketing_leads')
      .upsert(payload, { onConflict: 'email' })

    if (error) {
      console.error('Lead capture failed:', error.message)
      setStatus('error')
      setMessage('Could not save your request yet. Please try again in a moment.')
      return
    }

    setStatus('success')
    setMessage('Thanks — you are on the list. We will send you product updates and practical application tips.')
    setForm(prev => ({ ...prev, notes: '' }))
  }

  return (
    <section className={`leadCapture ${compact ? 'leadCapture--compact' : ''}`} aria-labelledby="lead-capture-title">
      <div className="leadCapture__copy">
        <p className="leadCapture__eyebrow">Early access</p>
        <h2 id="lead-capture-title">{title}</h2>
        <p>{description}</p>
        <ul>
          <li>No LinkedIn password or private page scraping.</li>
          <li>No payment is taken while checkout is being prepared.</li>
          <li>You can unsubscribe from product updates at any time.</li>
        </ul>
      </div>

      <form className="leadCapture__form" onSubmit={submit}>
        <label className="leadCapture__label">
          Email address
          <input
            type="email"
            value={form.email}
            onChange={event => update('email', event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="leadCapture__label">
          Target role
          <input
            type="text"
            value={form.targetRole}
            onChange={event => update('targetRole', event.target.value)}
            placeholder="IT Manager, Service Delivery Manager, Cloud Engineer..."
            maxLength={120}
          />
        </label>

        <div className="leadCapture__grid">
          <label className="leadCapture__label">
            Main goal
            <select value={form.goal} onChange={event => update('goal', event.target.value)}>
              {GOALS.map(goal => <option key={goal} value={goal}>{goal}</option>)}
            </select>
          </label>

          <label className="leadCapture__label">
            Market
            <select value={form.market} onChange={event => update('market', event.target.value)}>
              {MARKETS.map(market => <option key={market} value={market}>{market}</option>)}
            </select>
          </label>
        </div>

        <label className="leadCapture__label">
          Optional context
          <textarea
            value={form.notes}
            onChange={event => update('notes', event.target.value)}
            placeholder="Example: I want to apply for IT Manager roles in Paris and improve my interview rate."
            maxLength={600}
            rows={compact ? 3 : 4}
          />
        </label>

        <label className="leadCapture__consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={event => update('consent', event.target.checked)}
          />
          <span>Send me Joblytics product updates and job-search improvement tips.</span>
        </label>

        <input
          className="leadCapture__honeypot"
          type="text"
          value={form.website}
          onChange={event => update('website', event.target.value)}
          tabIndex="-1"
          autoComplete="off"
          aria-hidden="true"
        />

        <button className="leadCapture__button" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Saving...' : 'Join early access'}
        </button>

        {message && <p className={`leadCapture__message leadCapture__message--${status}`}>{message}</p>}
      </form>
    </section>
  )
}
