import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './ActiveCvVersionSelector.css'

function formatDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value))
  } catch {
    return value
  }
}

function cleanSnippet(text = '') {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 150)
}

export default function ActiveCvVersionSelector({ disabled = false, onVersionChange }) {
  const { user } = useAuth()
  const [versions, setVersions] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [useActive, setUseActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) {
      setVersions([])
      setSelectedId('')
      onVersionChange?.(null, false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    ;(async () => {
      const { data, error } = await supabase
        .from('cv_versions')
        .select('id,label,target_role,language,notes,cv_text,is_active,created_at,updated_at')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(12)

      if (cancelled) return

      if (error) {
        setError(error.message)
        setVersions([])
        setSelectedId('')
        onVersionChange?.(null, false)
      } else {
        const rows = data || []
        const preferred = rows.find(row => row.is_active) || rows[0] || null
        setVersions(rows)
        setSelectedId(preferred?.id || '')
        onVersionChange?.(preferred, Boolean(preferred && useActive))
      }

      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user?.id])

  const selected = useMemo(() => versions.find(item => item.id === selectedId) || versions.find(item => item.is_active) || versions[0] || null, [versions, selectedId])

  useEffect(() => {
    onVersionChange?.(selected || null, Boolean(selected && useActive))
  }, [selectedId, useActive, versions.length])

  if (!user?.id) return null

  if (loading) {
    return <div className="activeCvBox activeCvBox--muted">Loading your active CV version…</div>
  }

  if (error) {
    return <div className="activeCvBox activeCvBox--warning">CV vault is not available yet. Upload a CV file below instead.</div>
  }

  if (!versions.length) {
    return (
      <div className="activeCvBox activeCvBox--muted">
        <strong>No saved CV version yet.</strong>
        <span>Upload a CV below, or create a role-specific CV in CV Coach.</span>
      </div>
    )
  }

  return (
    <div className={`activeCvBox ${useActive ? 'activeCvBox--selected' : ''}`}>
      <div className="activeCvBox-head">
        <div>
          <p className="activeCvBox-kicker">CV source</p>
          <h3>Use saved CV version for this analysis</h3>
          <p>Joblytics will analyze the selected CV vault version. No file upload is required.</p>
        </div>
        <label className="activeCvSwitch">
          <input
            type="checkbox"
            checked={useActive}
            disabled={disabled || !selected}
            onChange={event => setUseActive(event.target.checked)}
          />
          <span>{useActive ? 'Using vault CV' : 'Use upload below'}</span>
        </label>
      </div>

      <div className="activeCvControls">
        <select
          value={selectedId}
          disabled={disabled || !useActive}
          onChange={event => setSelectedId(event.target.value)}
        >
          {versions.map(version => (
            <option key={version.id} value={version.id}>
              {version.is_active ? '★ ' : ''}{version.label || 'Saved CV'}{version.target_role ? ` · ${version.target_role}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selected && useActive && (
        <div className="activeCvMeta">
          <span>{selected.language || 'auto'}</span>
          {selected.target_role && <span>{selected.target_role}</span>}
          {selected.is_active && <span className="activeCvMeta-good">Active</span>}
          {selected.updated_at && <span>Updated {formatDate(selected.updated_at)}</span>}
        </div>
      )}

      {selected && useActive && (
        <p className="activeCvSnippet">{cleanSnippet(selected.cv_text)}</p>
      )}
    </div>
  )
}
