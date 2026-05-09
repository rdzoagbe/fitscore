import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { trackEvent, analyticsEvents } from '../utils/analytics'
import './ApplicationTrackerPanel.css'

const DEFAULT_TRACKER = {
  recruiter_name: '',
  recruiter_email: '',
  interview_date: '',
  follow_up_date: '',
  notes: ''
}

function normalizeTracker(value) {
  return { ...DEFAULT_TRACKER, ...(value && typeof value === 'object' ? value : {}) }
}

export default function ApplicationTrackerPanel({ analysis, onUpdate, onClose }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => normalizeTracker(analysis?.application_tracker || analysis?.tracker))

  if (!analysis) return null

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('analyses')
        .update({ application_tracker: payload })
        .eq('id', analysis.id)
        .select()
        .single()

      if (error) throw error
      onUpdate?.(data || { ...analysis, application_tracker: payload })
      trackEvent(analyticsEvents.APPLICATION_TRACKER_UPDATED, {
        has_recruiter: Boolean(payload.recruiter_name || payload.recruiter_email),
        has_interview_date: Boolean(payload.interview_date),
        has_follow_up_date: Boolean(payload.follow_up_date),
        has_notes: Boolean(payload.notes)
      })
      onClose?.()
    } catch (error) {
      alert(error.message || 'Could not save tracker details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="trackerPanel-overlay" onClick={onClose}>
      <section className="trackerPanel" onClick={event => event.stopPropagation()}>
        <button type="button" className="trackerPanel-close" onClick={onClose}>×</button>
        <p className="trackerPanel-kicker">Application tracker</p>
        <h2>{analysis.job_title || analysis.result?.job_context?.title || 'Application'}</h2>
        <p className="trackerPanel-subtitle">Add recruiter details, interview dates, follow-up reminders, and private notes for this opportunity.</p>

        <div className="trackerPanel-grid">
          <label>
            <span>Recruiter name</span>
            <input value={form.recruiter_name} onChange={event => setField('recruiter_name', event.target.value)} placeholder="e.g. Marie Dupont" />
          </label>
          <label>
            <span>Recruiter email</span>
            <input value={form.recruiter_email} onChange={event => setField('recruiter_email', event.target.value)} placeholder="name@company.com" type="email" />
          </label>
          <label>
            <span>Interview date</span>
            <input value={form.interview_date} onChange={event => setField('interview_date', event.target.value)} type="datetime-local" />
          </label>
          <label>
            <span>Follow-up date</span>
            <input value={form.follow_up_date} onChange={event => setField('follow_up_date', event.target.value)} type="date" />
          </label>
        </div>

        <label className="trackerPanel-notes">
          <span>Notes</span>
          <textarea value={form.notes} onChange={event => setField('notes', event.target.value)} placeholder="Add next steps, interview preparation notes, contact history, salary expectations…" rows={6} />
        </label>

        <div className="trackerPanel-actions">
          <button type="button" className="trackerPanel-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="trackerPanel-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save tracker'}</button>
        </div>
      </section>
    </div>
  )
}
