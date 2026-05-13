import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './CvVersionVault.css'

const emptyForm = {
  label: '',
  target_role: '',
  language: 'en',
  notes: '',
  cv_text: ''
}

function getJobTitle(analysis) {
  return analysis?.result?.job_context?.title || analysis?.job_title || ''
}

function getCompany(analysis) {
  const company = analysis?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

function formatDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function CvVersionVault({ selectedAnalysis }) {
  const { user } = useAuth()
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const selectedMeta = useMemo(() => {
    const title = getJobTitle(selectedAnalysis)
    const company = getCompany(selectedAnalysis)
    const score = Number(selectedAnalysis?.score || 0)
    return { title, company, score }
  }, [selectedAnalysis])

  useEffect(() => {
    if (!user?.id) return
    fetchVersions()
  }, [user?.id])

  useEffect(() => {
    if (!selectedAnalysis || form.label || form.target_role) return
    const title = selectedMeta.title || 'Target role'
    setForm(current => ({
      ...current,
      label: `${title} CV`,
      target_role: title
    }))
  }, [selectedAnalysis?.id])

  async function fetchVersions() {
    if (!user?.id) return
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('cv_versions')
      .select('*')
      .eq('user_id', user.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      setVersions([])
    } else {
      setVersions(data || [])
    }

    setLoading(false)
  }

  async function saveVersion() {
    if (!user?.id) {
      setError('Please sign in to save CV versions.')
      return
    }
    if (!form.label.trim()) {
      setError('Add a short name for this CV version.')
      return
    }
    if (!form.cv_text.trim()) {
      setError('Paste the CV text you want to save as a reusable version.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      user_id: user.id,
      label: form.label.trim(),
      target_role: form.target_role.trim() || selectedMeta.title || null,
      language: form.language || 'en',
      notes: form.notes.trim() || null,
      cv_text: form.cv_text.trim(),
      source_analysis_id: selectedAnalysis?.id || null,
      source_score: Number(selectedAnalysis?.score || 0) || null,
      is_active: versions.length === 0
    }

    const { error: saveError } = await supabase
      .from('cv_versions')
      .insert(payload)

    if (saveError) {
      setError(saveError.message)
    } else {
      setMessage('CV version saved.')
      setForm(emptyForm)
      setExpanded(false)
      await fetchVersions()
    }

    setSaving(false)
  }

  async function markActive(versionId) {
    if (!user?.id || !versionId) return
    setError('')
    setMessage('')

    const { error: resetError } = await supabase
      .from('cv_versions')
      .update({ is_active: false })
      .eq('user_id', user.id)

    if (resetError) {
      setError(resetError.message)
      return
    }

    const { error: activeError } = await supabase
      .from('cv_versions')
      .update({ is_active: true })
      .eq('id', versionId)
      .eq('user_id', user.id)

    if (activeError) setError(activeError.message)
    else {
      setMessage('Active CV version updated.')
      await fetchVersions()
    }
  }

  async function deleteVersion(versionId) {
    if (!user?.id || !versionId) return
    const ok = window.confirm('Delete this CV version from your vault?')
    if (!ok) return

    setError('')
    setMessage('')
    const { error: deleteError } = await supabase
      .from('cv_versions')
      .delete()
      .eq('id', versionId)
      .eq('user_id', user.id)

    if (deleteError) setError(deleteError.message)
    else {
      setMessage('CV version deleted.')
      await fetchVersions()
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text || '')
    setMessage('CV text copied.')
  }

  if (!user) {
    return (
      <section className="cvVault-card cvVault-muted">
        <div>
          <p className="cvVault-kicker">CV Versioning</p>
          <h2>Save role-specific CVs</h2>
          <p>Sign in to save tailored CV versions for each target role.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="cvVault-card">
      <div className="cvVault-header">
        <div>
          <p className="cvVault-kicker">CV Versioning</p>
          <h2>Role-specific CV vault</h2>
          <p>Save tailored CV versions for IT Manager, Service Delivery, Cloud, Support, or any target role.</p>
        </div>
        <button type="button" className="cvVault-primary" onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Close' : '+ Save CV version'}
        </button>
      </div>

      {selectedMeta.title && (
        <div className="cvVault-context">
          <span>Current target</span>
          <strong>{selectedMeta.title}{selectedMeta.company ? ` @ ${selectedMeta.company}` : ''}</strong>
          {selectedMeta.score > 0 && <em>{selectedMeta.score}% match</em>}
        </div>
      )}

      {expanded && (
        <div className="cvVault-form">
          <div className="cvVault-grid">
            <label>
              <span>Version name</span>
              <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Service Delivery Manager CV" />
            </label>
            <label>
              <span>Target role</span>
              <input value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })} placeholder="IT Manager / SDM / Cloud Manager" />
            </label>
            <label>
              <span>Language</span>
              <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="both">Both</option>
              </select>
            </label>
          </div>
          <label>
            <span>Notes</span>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Best for RUN/MCO, stakeholder management, ITIL, vendor governance..." />
          </label>
          <label>
            <span>CV text</span>
            <textarea value={form.cv_text} onChange={e => setForm({ ...form, cv_text: e.target.value })} placeholder="Paste the tailored CV text you want to reuse later." rows={8} />
          </label>
          <div className="cvVault-actions">
            <button type="button" className="cvVault-primary" disabled={saving} onClick={saveVersion}>{saving ? 'Saving...' : 'Save to vault'}</button>
            <button type="button" onClick={() => setForm(emptyForm)}>Clear</button>
          </div>
        </div>
      )}

      {error && <div className="cvVault-alert cvVault-alert--error">⚠ {error}</div>}
      {message && <div className="cvVault-alert cvVault-alert--success">✓ {message}</div>}

      <div className="cvVault-list">
        {loading && <div className="cvVault-empty">Loading saved CV versions...</div>}
        {!loading && versions.length === 0 && <div className="cvVault-empty">No saved CV versions yet. Save your first role-specific CV above.</div>}
        {!loading && versions.map(version => (
          <article key={version.id} className={`cvVault-version ${version.is_active ? 'is-active' : ''}`}>
            <div>
              <div className="cvVault-versionTop">
                <strong>{version.label}</strong>
                {version.is_active && <span>Active</span>}
              </div>
              <p>{version.target_role || 'General CV'} · {version.language?.toUpperCase?.() || 'EN'} · {formatDate(version.created_at)}</p>
              {version.notes && <small>{version.notes}</small>}
            </div>
            <div className="cvVault-versionActions">
              <button type="button" onClick={() => copyText(version.cv_text)}>Copy</button>
              {!version.is_active && <button type="button" onClick={() => markActive(version.id)}>Set active</button>}
              <button type="button" className="cvVault-danger" onClick={() => deleteVersion(version.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
