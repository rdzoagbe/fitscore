import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { trackEvent, analyticsEvents } from '../utils/analytics'
import './ApplicationTrackerModal.css'

const STATUS_OPTIONS = [
  { value: '', label: 'Not applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'technical_test', label: 'Technical test' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' }
]

function getInitialTracker(analysis) {
  const tracker = analysis?.result?.application_tracker || {}
  return {
    application_date: tracker.application_date || '',
    recruiter_name: tracker.recruiter_name || '',
    recruiter_email: tracker.recruiter_email || '',
    interview_date: tracker.interview_date || '',
    follow_up_date: tracker.follow_up_date || '',
    notes: tracker.notes || '',
    source: tracker.source || '',
    next_action: tracker.next_action || ''
  }
}

function toInputDateTime(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16)
  } catch { return '' }
}

function normalizeDate(value, isDateTime = false) {
  if (!value) return null
  if (!isDateTime) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default function ApplicationTrackerModal({ analysis, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(analysis?.application_status || '')
  const [tracker, setTracker] = useState(() => getInitialTracker(analysis))

  const title = analysis?.job_title || analysis?.result?.job_context?.title || 'Application'
  const company = analysis?.result?.job_context?.company

  const derivedSource = useMemo(() => {
    if (tracker.source) return tracker.source
    try { return new URL(analysis?.job_url).hostname.replace('www.', '') } catch { return '' }
  }, [tracker.source, analysis?.job_url])

  const update = (field, value) => setTracker(prev => ({ ...prev, [field]: value }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const nextTracker = {
        application_date: normalizeDate(tracker.application_date),
        recruiter_name: tracker.recruiter_name.trim() || null,
        recruiter_email: tracker.recruiter_email.trim() || null,
        interview_date: normalizeDate(tracker.interview_date, true),
        follow_up_date: normalizeDate(tracker.follow_up_date),
        notes: tracker.notes.trim() || null,
        source: tracker.source.trim() || derivedSource || null,
        next_action: tracker.next_action.trim() || null,
        updated_at: new Date().toISOString()
      }

      const nextResult = {
        ...(analysis.result || {}),
        application_tracker: nextTracker
      }

      const payload = {
        application_status: status || null,
        status_updated_at: new Date().toISOString(),
        result: nextResult
      }

      const { data, error: saveError } = await supabase
        .from('analyses')
        .update(payload)
        .eq('id', analysis.id)
        .select()
        .single()

      if (saveError) throw saveError
      trackEvent(analyticsEvents.APPLICATION_TRACKER_UPDATED, {
        status: status || 'not_applied',
        has_recruiter: Boolean(nextTracker.recruiter_name || nextTracker.recruiter_email),
        has_follow_up: Boolean(nextTracker.follow_up_date),
        has_interview: Boolean(nextTracker.interview_date)
      })
      onSaved?.(data)
      onClose?.()
    } catch (e) {
      setError(e.message || 'Could not save tracker details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="trackerModal-overlay" onClick={onClose}>
      <section className="trackerModal" onClick={event => event.stopPropagation()}>
        <button type="button" className="trackerModal-close" onClick={onClose}>×</button>
        <p className="trackerModal-kicker">Application tracker</p>
        <h2>{title}</h2>
        {company && company !== 'Not specified' && <p className="trackerModal-company">@ {company}</p>}

        <div className="trackerModal-grid">
          <label>
            <span>Status</span>
            <select value={status} onChange={event => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Application date</span>
            <input type="date" value={tracker.application_date || ''} onChange={event => update('application_date', event.target.value)} />
          </label>
          <label>
            <span>Recruiter name</span>
            <input value={tracker.recruiter_name || ''} onChange={event => update('recruiter_name', event.target.value)} placeholder="e.g. Marie Dupont" />
          </label>
          <label>
            <span>Recruiter email</span>
            <input type="email" value={tracker.recruiter_email || ''} onChange={event => update('recruiter_email', event.target.value)} placeholder="name@company.com" />
          </label>
          <label>
            <span>Interview date</span>
            <input type="datetime-local" value={toInputDateTime(tracker.interview_date)} onChange={event => update('interview_date', event.target.value)} />
          </label>
          <label>
            <span>Follow-up date</span>
            <input type="date" value={tracker.follow_up_date || ''} onChange={event => update('follow_up_date', event.target.value)} />
          </label>
          <label>
            <span>Source</span>
            <input value={tracker.source || derivedSource || ''} onChange={event => update('source', event.target.value)} placeholder="LinkedIn, Welcome to the Jungle…" />
          </label>
          <label>
            <span>Next action</span>
            <input value={tracker.next_action || ''} onChange={event => update('next_action', event.target.value)} placeholder="Follow up, prepare interview…" />
          </label>
        </div>

        <label className="trackerModal-notes">
          <span>Notes</span>
          <textarea value={tracker.notes || ''} onChange={event => update('notes', event.target.value)} placeholder="Add recruiter context, interview feedback, salary notes, next steps…" rows={5} />
        </label>

        {error && <p className="trackerModal-error">{error}</p>}

        <div className="trackerModal-actions">
          <button type="button" onClick={onClose} className="trackerModal-secondary">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="trackerModal-primary">{saving ? 'Saving…' : 'Save tracker'}</button>
        </div>
      </section>
    </div>
  )
}
