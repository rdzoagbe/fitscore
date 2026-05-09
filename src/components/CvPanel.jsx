import React, { useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'
import { useUsageSummary } from '../hooks/useUsageSummary'

const ACCEPTED = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']

function formatSize(size) {
  return size ? `${(size / 1024).toFixed(0)} KB` : ''
}

function fileIcon(type) {
  return type === 'application/pdf' ? '📄' : '📝'
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

export default function CvPanel() {
  const { t } = useLang()
  const { cvFile, cvFiles, selectedCvId, loading, saveCv, selectCv, removeCv } = useCvPersist()
  const usage = useUsageSummary()
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')

  const cvLimitReached = usage?.cvs?.limit < 9999 && cvFiles.length >= usage.cvs.limit

  const triggerUpload = () => {
    setLimitMessage('')
    if (cvLimitReached) {
      setLimitMessage(`Your ${usage.planLabel} plan allows ${usage.cvs.limit} stored CVs. Delete one CV or view upgrade options.`)
      return
    }
    fileInputRef.current?.click()
  }

  const handleFile = (file) => {
    if (!file) return
    if (cvLimitReached) {
      setLimitMessage(`Your ${usage.planLabel} plan allows ${usage.cvs.limit} stored CVs. Delete one CV or view upgrade options.`)
      return
    }
    if (!ACCEPTED.includes(file.type)) { alert(t('cv_pdf_word_only') || 'PDF or Word only'); return }
    if (file.size > 10 * 1024 * 1024) { alert(t('cv_max_10mb') || 'Max 10MB'); return }
    saveCv(file)
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
            <div key={file.id} onClick={() => selectCv(file.id)} style={{
              background: active ? 'rgba(255,142,107,0.10)' : 'var(--bg-card)',
              border: `1px solid ${active ? 'rgba(255,142,107,0.45)' : 'transparent'}`,
              borderRadius: 12,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer'
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{fileIcon(file.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: active ? 'var(--accent)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 7px', flexShrink: 0 }}>{file.label || 'CV'}</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatSize(file.size)}{active ? ` · ${t('selected_cv') || 'Selected'}` : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={event => event.stopPropagation()}>
                <button onClick={() => openPreview(file)} title={t('preview_cv') || 'Preview'} style={iconBtnStyle}>👁</button>
                <button onClick={() => { setLimitMessage(''); removeCv(file.id) }} title={t('clear_cv') || 'Remove'} style={{ ...iconBtnStyle, color: '#ff6b6b' }}>🗑</button>
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
