import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './FeedbackWidget.css'

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'ux', label: 'UX issue' },
  { value: 'copy', label: 'Text/copy' },
  { value: 'idea', label: 'Feature idea' },
  { value: 'praise', label: 'Positive feedback' }
]

function getPageContext() {
  if (typeof window === 'undefined') return { path: '/', url: '' }
  return {
    path: window.location.pathname,
    url: window.location.href,
    userAgent: window.navigator?.userAgent || ''
  }
}

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('ux')
  const [rating, setRating] = useState(4)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)

  const canSubmit = message.trim().length >= 8 && !sending
  const context = useMemo(() => getPageContext(), [open])

  async function submitFeedback(event) {
    event.preventDefault()
    if (!canSubmit) return

    setSending(true)
    setStatus(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user

      const payload = {
        user_id: user?.id || null,
        email: email.trim() || user?.email || null,
        feedback_type: type,
        rating,
        message: message.trim().slice(0, 3000),
        page_path: context.path,
        page_url: context.url,
        metadata: {
          userAgent: context.userAgent,
          source: 'floating_feedback_widget'
        }
      }

      const { error } = await supabase.from('feedback_items').insert(payload)
      if (error) throw error

      setStatus({ type: 'success', text: 'Thanks — your feedback was saved.' })
      setMessage('')
      setEmail('')
      setType('ux')
      setRating(4)
      setTimeout(() => setOpen(false), 1200)
    } catch (error) {
      setStatus({
        type: 'error',
        text: error?.message || 'Could not save feedback. Please try again.'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="feedback-widget" aria-live="polite">
      {open && (
        <div className="feedback-panel" role="dialog" aria-label="Send product feedback">
          <div className="feedback-panel__header">
            <div>
              <p className="feedback-panel__eyebrow">Soft-launch feedback</p>
              <h2>Help improve Joblytics</h2>
            </div>
            <button className="feedback-panel__close" onClick={() => setOpen(false)} aria-label="Close feedback form">×</button>
          </div>

          <form onSubmit={submitFeedback} className="feedback-form">
            <label>
              Feedback type
              <select value={type} onChange={e => setType(e.target.value)}>
                {FEEDBACK_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>

            <label>
              Rating
              <input type="range" min="1" max="5" value={rating} onChange={e => setRating(Number(e.target.value))} />
              <span className="feedback-rating">{rating}/5</span>
            </label>

            <label>
              What should we improve?
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what felt confusing, broken, useful, or missing."
                rows={5}
                maxLength={3000}
              />
            </label>

            <label>
              Email optional
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <p className="feedback-context">Page: {context.path}</p>

            {status && <p className={`feedback-status feedback-status--${status.type}`}>{status.text}</p>}

            <button className="feedback-submit" type="submit" disabled={!canSubmit}>
              {sending ? 'Sending…' : 'Send feedback'}
            </button>
          </form>
        </div>
      )}

      <button className="feedback-floating-button" onClick={() => setOpen(v => !v)}>
        Feedback
      </button>
    </div>
  )
}
