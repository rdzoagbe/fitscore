import React, { useState } from 'react'
import { useLang } from '../context/LangContext'

export default function CvPreview({ preview, truncated }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)

  if (!preview || preview.length < 30) return null

  const isShort = preview.length < 200

  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%',
        background: 'var(--bg-input)',
        border: `1px solid ${isShort ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
        borderRadius: 12, padding: '11px 14px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, fontFamily: 'inherit', textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>{isShort ? '⚠️' : '🔍'}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: isShort ? '#f5a623' : 'var(--text-primary)', marginBottom: 1 }}>
              {isShort ? t('cv_preview_warn') : t('cv_preview_title')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {isShort ? t('cv_preview_warn_desc') : t('cv_preview_desc')}
            </p>
          </div>
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 8, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, animation: 'fadeUp 0.2s ease' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('extracted_text')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 240, overflowY: 'auto', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8 }}>
            {preview}
            {truncated && <span style={{ color: 'var(--text-muted)' }}>...</span>}
          </p>
          {isShort && (
            <p style={{ fontSize: 11, color: '#f5a623', marginTop: 8, lineHeight: 1.5 }}>
              💡 {t('cv_preview_fix_hint')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}