import React, { useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'

const ACCEPTED = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']

function formatSize(size) {
  return size ? `${(size / 1024).toFixed(0)} KB` : ''
}

function fileIcon(type) {
  return type === 'application/pdf' ? '📄' : '📝'
}

export default function CvPanel() {
  const { t } = useLang()
  const { cvFile, cvFiles, selectedCvId, loading, saveCv, selectCv, removeCv } = useCvPersist()
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert(t('cv_pdf_word_only') || 'PDF or Word only'); return }
    if (file.size > 10 * 1024 * 1024) { alert(t('cv_max_10mb') || 'Max 10MB'); return }
    saveCv(file)
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
    <div
      onDrop={onDrop}
      onDragOver={event => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onClick={() => fileInputRef.current?.click()}
      style={{ border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: 'clamp(24px,5vw,40px) 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--accent-bg)' : 'var(--bg-input)', transition: 'all 0.2s' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('drop_cv')}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('cv_format')}</p>
      <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8 }}>{t('cv_saved')}</p>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={event => handleFile(event.target.files[0])} />
    </div>
  )

  return (
    <div style={{ background: 'rgba(76,175,125,0.06)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#4caf7d', fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4caf7d', fontFamily: 'Syne, sans-serif' }}>
            {t('cv_saved_ready') || 'Saved & Ready!'}
          </span>
        </div>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ ...smallButtonStyle, color: 'var(--accent)', borderColor: 'rgba(255,142,107,0.35)' }}>
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
                <button onClick={() => removeCv(file.id)} title={t('clear_cv') || 'Remove'} style={{ ...iconBtnStyle, color: '#ff6b6b' }}>🗑</button>
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
