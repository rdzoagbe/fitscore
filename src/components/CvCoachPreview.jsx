import React from 'react'
import { useLang } from '../context/LangContext'

export default function CvCoachPreview({ data, onGoCoach }) {
  const { t } = useLang()
  const wins = data.quick_wins || []
  const missing = data.keyword_match?.missing_required || []

  if (wins.length === 0 && missing.length === 0) return null

  // Show top 2 quick wins as preview
  const previewWins = wins.slice(0, 2)
  const remainingCount = wins.length - 2 + (missing.length > 0 ? 1 : 0)

  return (
    <div style={{ marginBottom: 10, background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            ✏️ {t('coach_preview_kicker') || 'Your CV upgrade plan'}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            {t('coach_preview_title') || 'Top changes to make'}
          </p>
        </div>
        <button onClick={onGoCoach} style={{ background: 'var(--accent)', border: 'none', borderRadius: 20, padding: '7px 14px', color: '#1A1B22', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif', flexShrink: 0 }}>
          {t('open_coach') || 'Open CV Coach'} →
        </button>
      </div>

      <div style={{ padding: 14 }}>
        {previewWins.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginBottom: missing.length > 0 ? 12 : 0 }}>
            {previewWins.map((w, i) => {
              const tip = typeof w === 'string' ? w : w.tip
              return (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 10, borderLeft: '3px solid var(--accent)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne, sans-serif', flexShrink: 0 }}>{i + 1}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{tip}</p>
                </div>
              )
            })}
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {t('add_keywords') || 'Add these keywords'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {missing.slice(0, 5).map(k => (
                <span key={k} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,107,107,0.1)', color: '#ff7878', border: '1px solid rgba(255,107,107,0.2)' }}>
                  + {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {remainingCount > 0 && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
            + {remainingCount} {t('more_in_coach') || 'more in CV Coach'}
          </p>
        )}
      </div>
    </div>
  )
}
