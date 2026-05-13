import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './AdminFeedbackPage.css'

const TYPE_LABELS = {
  bug: 'Bug',
  ux: 'UX issue',
  copy: 'Text/copy',
  idea: 'Feature idea',
  praise: 'Positive feedback'
}

export default function AdminFeedbackPage({ setPage }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadFeedback() {
      setStatus('loading')
      setError(null)

      try {
        const { data, error } = await supabase
          .from('feedback_items')
          .select('id,feedback_type,rating,message,email,page_path,status,created_at')
          .order('created_at', { ascending: false })
          .limit(150)

        if (error) throw error
        if (!cancelled) {
          setItems(data || [])
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load feedback.')
          setStatus('error')
        }
      }
    }

    loadFeedback()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter(item => item.feedback_type === filter)
  }, [items, filter])

  const stats = useMemo(() => {
    const total = items.length
    const avg = total ? (items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total).toFixed(1) : '—'
    const bugs = items.filter(item => item.feedback_type === 'bug').length
    const ux = items.filter(item => item.feedback_type === 'ux').length
    return { total, avg, bugs, ux }
  }, [items])

  return (
    <main className="admin-feedback-page">
      <section className="admin-feedback-hero">
        <p className="admin-feedback-eyebrow">Soft-launch feedback</p>
        <h1>Product feedback inbox</h1>
        <p>Review beta tester feedback without exposing private CV, cover-letter, or LinkedIn profile content.</p>
      </section>

      <section className="feedback-stat-grid">
        <article><span>Total feedback</span><strong>{stats.total}</strong></article>
        <article><span>Average rating</span><strong>{stats.avg}</strong></article>
        <article><span>Bugs</span><strong>{stats.bugs}</strong></article>
        <article><span>UX notes</span><strong>{stats.ux}</strong></article>
      </section>

      <section className="feedback-inbox-card">
        <div className="feedback-inbox-header">
          <div>
            <h2>Recent feedback</h2>
            <p>Use this during soft launch to prioritize fixes before public promotion.</p>
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="bug">Bug</option>
            <option value="ux">UX issue</option>
            <option value="copy">Text/copy</option>
            <option value="idea">Feature idea</option>
            <option value="praise">Positive feedback</option>
          </select>
        </div>

        {status === 'loading' && <p className="feedback-empty">Loading feedback…</p>}
        {status === 'error' && <p className="feedback-error">{error}</p>}
        {status === 'ready' && filtered.length === 0 && <p className="feedback-empty">No feedback found for this filter yet.</p>}

        <div className="feedback-list">
          {filtered.map(item => (
            <article key={item.id} className="feedback-row">
              <div className="feedback-row-top">
                <span className={`feedback-type feedback-type--${item.feedback_type}`}>{TYPE_LABELS[item.feedback_type] || item.feedback_type}</span>
                <span className="feedback-rating-chip">{item.rating || '—'}/5</span>
                <span className="feedback-date">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <p className="feedback-message">{item.message}</p>
              <div className="feedback-meta">
                <span>{item.page_path || '/'}</span>
                {item.email && <span>{item.email}</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
