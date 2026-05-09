import React, { useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'
import { useUsageSummary } from '../hooks/useUsageSummary'
import { trackEvent, analyticsEvents } from '../utils/analytics'

const ACCEPTED = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']
const LANG_OPTIONS = ['Auto', 'EN', 'FR', 'ES', 'DE', 'IT', 'PT']

function formatSize(size) {
  return size ? `${(size / 1024).toFixed(0)} KB` : ''
}

function fileIcon(type) {
  return type === 'application/pdf' ? '📄' : '📝'
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function LimitNotice({ usage }) {
  if (!usage || usage.cvs.limit >= 9999 || usage.cvs.used < usage.cvs.limit) return null
  return (
    <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.25)' }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)', fontWeight: 800 }}>CV limit reached</p>
      <p style={{ margin: '3px 0 8px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
        Your {usage.planLabel} plan allows {usage.cvs.limit} stored CVs. Delete one CV or view upgrade options.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href="/pricing" style={noticeLinkStyle}>View pricing</a>
        <a href="/limits" style={noticeLinkStyle}>Usage limits</a>
      </div>
    </div>
  )
}

function CvEditPanel({ file, onSave, onCancel }) {
  const [displayName, setDisplayName] = useState(file.displayName || file.name || '')
  const [languageTag, setLanguageTag] = useState(file.languageTag || file.label || 'Auto')
  const [roleTag, setRoleTag] = useState(file.roleTag || '')

  return (
    <div style={editPanelStyle} onClick={event => event.stopPropagation()}>
      <label style={editLabelStyle}>CV name</label>
      <input value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="e.g. IT Manager CV" style={editInputStyle} />
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginTop: 8 }}>
        <div>
          <label style={editLabelStyle}>Language</label>
          <select value={languageTag} onChange={event => setLanguageTag(event.target.value)} style={editInputStyle}>
            {LANG_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div>
          <label style={editLabelStyle}>Role tag</label>
          <input value={roleTag} onChange={event => setRoleTag(event.target.value)} placeholder="IT Manager, SDM…" style={editInputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        <button type="button" onClick={onCancel} style={smallButtonStyle}>Cancel</button>
        <button type="button" onClick={() => onSave({ displayName, languageTag, roleTag })} style={{ ...smallButtonStyle, background: 'var(--accent)', color: 'var(--text-inverse)', borderColor: 'transparent' }}>Save</button>
      </div>
    </div>
  )
}

export default function CvPanel() {
  const { t } = useLang()
  const { cvFiles, selectedCvId, loading, saveCv, selectCv, setDefaultCv, updateCvMetadata, removeCv } = useCvPersist()
  const usage = useUsageSummary()
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const [editingId, setEditingId] = useState(null)

  const cvLimitReached = usage?.cvs?.limit < 9999 && cvFiles.length >= usage.cvs.limit

  const triggerUpload = () => {
    setLimitMessage('')
    if (cvLimitReached) {
      setLimitMessage(`Your ${usage.planLabel} plan allows ${usage.cvs.limit} stored CVs. Delete one CV or view upgrade options.`)
      return
    }
    fileInputRef.current?.click()
  }

  const handleFile = async (file) => {
    if (!file) return
    if (cvLimitReached) {
      setLimitMessage(`Your ${usage.planLabel} plan allows ${usage.cvs.limit} stored CVs. Delete one CV or view upgrade options.`)
      return
    }
    if (!ACCEPTED.includes(file.type)) { alert(t('cv_pdf_word_only') || 'PDF or Word only'); return }
    if (file.size > 10 * 1024 * 1024) { alert(t('cv_max_10mb') || 'Max 10MB'); return }
    await saveCv(file)
    trackEvent(analyticsEvents.CV_UPLOADED, { type: file.type, size: file.size })
    setLimitMessage('')
  }

  const openPreview = (storedOrFile) => {
    const source = storedOrFile?.blob ? new File([storedOrFile.blob], storedOrFile.name, { type: storedOrFile.type }) : storedOrFile
    const blob = new Blob([source], { type: source.type })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  if (loading) return <div className="skeleton" style={{ height: 88, borderRadius: 14 }} />

  if (!cvFiles.length) return (
    <>
      {limitMessage && <div style={errorBoxStyle}>{limitMessage}</div>}
      <div
        onDrop={onDrop}
        onDragOver={event => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={triggerUpload}
        style={{ border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: 'clamp(24px,5vw,40px) 20px', textAlign: 'center', cursor: cvLimitReached ? 'not-allowed' : 'pointer', background: dragging ? 'var(--accent-bg)' : 'var(--bg-input)', opacity: cvLimitReached ? 0.78 : 1, transition: 'all 0.2s' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('drop_cv')}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('cv_format')}</p>
        <p style={{ fontSize: 11, color: cvLimitReached ? 'var(--danger)' : 'var(--accent)', marginTop: 8 }}>
          {cvLimitReached ? `CV limit reached · ${usage.cvs.used}/${usage.cvs.limit}` : t('cv_saved')}
        </p>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={event => handleFile(event.target.files[0])} />
      </div>
    </>
  )

  return (
    <div style={{ background: 'rgba(76,175,125,0.06)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 14, padding: '12px 14px' }}>
      <LimitNotice usage={usage} />
      {limitMessage && <div style={errorBoxStyle}>{limitMessage}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#4caf7d', fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4caf7d', fontFamily: 'Syne, sans-serif' }}>
            {t('cv_saved_ready') || 'Saved & Ready!'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {cvFiles.length}/{usage?.cvs?.limit >= 9999 ? '∞' : usage?.cvs?.limit || '?'}</span>
        </div>
        <button type="button" onClick={triggerUpload} disabled={cvLimitReached} style={{ ...smallButtonStyle, color: cvLimitReached ? 'var(--text-muted)' : 'var(--accent)', borderColor: cvLimitReached ? 'var(--border)' : 'rgba(255,142,107,0.35)', cursor: cvLimitReached ? 'not-allowed' : 'pointer', opacity: cvLimitReached ? 0.65 : 1 }}>
          + {t('add_cv') || 'Add CV'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {cvFiles.map(file => {
          const active = file.id === selectedCvId
          return (
            <div key={file.id} onClick={() => { selectCv(file.id); trackEvent(analyticsEvents.CV_SELECTED, { language: file.languageTag || file.label || 'unknown', role: file.roleTag || 'none' }) }} style={{
              background: active ? 'rgba(255,142,107,0.10)' : 'var(--bg-card)',
              border: `1px solid ${active ? 'rgba(255,142,107,0.45)' : 'transparent'}`,
              borderRadius: 12,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              cursor: 'pointer'
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{fileIcon(file.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: active ? 'var(--accent)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{file.languageTag || file.label || 'CV'}</span>
                  {file.roleTag && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{file.roleTag}</span>}
                  {file.isDefault && <span style={{ fontSize: 10, fontWeight: 900, color: '#4caf7d', border: '1px solid rgba(76,175,125,0.3)', background: 'rgba(76,175,125,0.10)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>Default</span>}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 5 }}>{file.displayName || file.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatSize(file.size)}{active ? ` · ${t('selected_cv') || 'Selected'}` : ''}{file.lastUsedAt ? ` · Last used ${formatDate(file.lastUsedAt)}` : ''}</p>

                {editingId === file.id && (
                  <CvEditPanel
                    file={file}
                    onCancel={() => setEditingId(null)}
                    onSave={patch => {
                      updateCvMetadata(file.id, patch)
                      trackEvent(analyticsEvents.CV_METADATA_UPDATED, { language: patch.languageTag, role: patch.roleTag ? 'set' : 'empty' })
                      setEditingId(null)
                    }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }} onClick={event => event.stopPropagation()}>
                <button onClick={() => openPreview(file)} title={t('preview_cv') || 'Preview'} style={iconBtnStyle}>👁</button>
                <button onClick={() => setEditingId(editingId === file.id ? null : file.id)} title="Edit CV details" style={iconBtnStyle}>✎</button>
                <button onClick={() => { setDefaultCv(file.id); trackEvent(analyticsEvents.CV_DEFAULT_SET, { language: file.languageTag || file.label || 'unknown' }) }} title="Set as default CV" style={{ ...iconBtnStyle, color: file.isDefault ? '#4caf7d' : 'var(--text-secondary)' }}>★</button>
                <button onClick={() => { setLimitMessage(''); removeCv(file.id); trackEvent(analyticsEvents.CV_DELETED, {}) }} title={t('clear_cv') || 'Remove'} style={{ ...iconBtnStyle, color: '#ff6b6b' }}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
        *{t('cv_stored_locally') || 'Stored locally on your device for privacy'}*
      </p>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={event => handleFile(event.target.files[0])} />
    </div>
  )
}

const smallButtonStyle = {
  minHeight: 28,
  padding: '0 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 800,
  fontFamily: 'inherit'
}

const iconBtnStyle = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, transition: 'all 0.15s', color: 'var(--text-secondary)'
}

const errorBoxStyle = {
  marginBottom: 10,
  padding: '9px 11px',
  borderRadius: 12,
  background: 'var(--danger-soft)',
  border: '1px solid rgba(220,38,38,0.25)',
  color: 'var(--danger)',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45
}

const noticeLinkStyle = {
  minHeight: 26,
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 9px',
  borderRadius: 999,
  background: 'var(--bg-card)',
  border: '1px solid var(--border-soft)',
  color: 'var(--accent)',
  textDecoration: 'none',
  fontSize: 11,
  fontWeight: 800
}

const editPanelStyle = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  background: 'var(--bg-input)',
  border: '1px solid var(--border-soft)'
}

const editLabelStyle = {
  display: 'block',
  marginBottom: 4,
  color: 'var(--text-muted)',
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
}

const editInputStyle = {
  width: '100%',
  minHeight: 34,
  padding: '7px 9px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'inherit'
}
