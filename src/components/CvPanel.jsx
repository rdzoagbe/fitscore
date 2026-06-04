import React, { useRef } from 'react'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'

const ACCEPTED = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']
const MAX_CVS = 5

const iconBtnStyle = {
  background: 'var(--bg-input)', border: '1px solid var(--border)',
  borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, transition: 'all 0.15s', color: 'var(--text-secondary)',
  flexShrink: 0
}

export default function CvPanel() {
  const { t } = useLang()
  const { cvList, activeCvId, loading, saveCv, setActiveCv, deleteCv } = useCvPersist()
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert('PDF or Word only'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return }
    saveCv(file)
  }

  const previewCv = (cvEntry) => {
    const url = URL.createObjectURL(cvEntry.file)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }

  const onDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  if (loading) return <div className="skeleton" style={{ height: 70, borderRadius: 12 }} />

  if (cvList.length === 0) return (
    <div
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      style={{ border: '1.5px dashed var(--border)', borderRadius: 14, padding: 'clamp(24px,5vw,40px) 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)', transition: 'all 0.2s' }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('drop_cv')}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('cv_format')}</p>
      <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8 }}>{t('cv_saved')}</p>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )

  return (
    <div style={{ background: 'rgba(76,175,125,0.06)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#4caf7d', fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4caf7d', fontFamily: 'Syne, sans-serif' }}>
            {cvList.length > 1 ? `${cvList.length} CVs saved — select one` : (t('cv_saved_ready') || 'Saved & Ready')}
          </span>
        </div>
        {cvList.length < MAX_CVS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ background: 'none', border: '1px dashed rgba(76,175,125,0.5)', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 900, color: '#4caf7d', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Add CV
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {cvList.map(cv => {
          const isActive = cv.id === activeCvId
          const sizeKb = cv.size ? `${(cv.size / 1024).toFixed(0)} KB` : ''
          const icon = cv.type === 'application/pdf' ? '📄' : '📝'
          return (
            <div
              key={cv.id}
              onClick={() => setActiveCv(cv.id)}
              style={{
                background: isActive ? 'var(--bg-card)' : 'var(--bg-input)',
                border: isActive ? '1.5px solid rgba(76,175,125,0.5)' : '1px solid var(--border)',
                borderRadius: 10, padding: '9px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'all 0.15s'
              }}>
              <span style={{ fontSize: 11, color: isActive ? '#4caf7d' : 'var(--border)', fontWeight: 900, width: 14, flexShrink: 0 }}>{isActive ? '●' : '○'}</span>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{cv.name}</p>
                {sizeKb && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{sizeKb}</p>}
              </div>
              <button onClick={e => { e.stopPropagation(); previewCv(cv) }} title="Preview" style={iconBtnStyle}>👁</button>
              <button onClick={e => { e.stopPropagation(); deleteCv(cv.id) }} title="Remove" style={{ ...iconBtnStyle, color: '#ff6b6b' }}>🗑</button>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
        *{t('cv_stored_locally') || 'Stored locally on your device for privacy'}*
      </p>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}
