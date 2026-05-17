import React from 'react'
import { useLang } from '../context/LangContext'

const config = {
  right_level: { color: '#4caf7d', bg: 'rgba(76,175,125,0.1)', border: 'rgba(76,175,125,0.25)', icon: '🎯', emoji: '✓' },
  stretch: { color: '#FF8E6B', bg: 'rgba(255,142,107,0.1)', border: 'rgba(255,142,107,0.25)', icon: '🚀', emoji: '↗' },
  reach: { color: '#f5a623', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.25)', icon: '🏔️', emoji: '↑' },
  below_level: { color: '#7b8cff', bg: 'rgba(123,140,255,0.1)', border: 'rgba(123,140,255,0.25)', icon: '⬇', emoji: '↓' },
  pivot: { color: '#8DA3BD', bg: 'rgba(141,163,189,0.1)', border: 'rgba(141,163,189,0.25)', icon: '🔀', emoji: '↔' }
}

const levelKey = {
  intern: 'level_intern',
  junior: 'level_junior',
  mid: 'level_mid',
  senior: 'level_senior',
  lead: 'level_lead',
  staff_principal: 'level_staff_principal',
  executive: 'level_executive'
}

function levelLabel(t, value) {
  return levelKey[value] ? t(levelKey[value]) : value
}

function yearsLabel(t, value, plus = false) {
  if (!value || value <= 0) return null
  return `${value}${plus ? '+' : ''} ${value === 1 ? t('year') : t('years')}`
}

export default function SeniorityCard({ seniority }) {
  const { t } = useLang()
  if (!seniority || !seniority.alignment) return null

  const c = config[seniority.alignment] || config.right_level
  const candidateLevel = levelLabel(t, seniority.candidate_level)
  const jobLevel = levelLabel(t, seniority.job_level)

  return (
    <div className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {c.icon} {t('seniority_alignment')}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontFamily: 'Syne, sans-serif' }}>
          {seniority.alignment_label || seniority.alignment}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('your_level')}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{candidateLevel}</p>
          {seniority.candidate_years > 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{yearsLabel(t, seniority.candidate_years)}</p>}
        </div>

        <div style={{ flexShrink: 0, fontSize: 18, color: c.color, padding: '0 4px' }}>{c.emoji}</div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{t('job_level')}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{jobLevel}</p>
          {seniority.job_years_required > 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{yearsLabel(t, seniority.job_years_required, true)}</p>}
        </div>
      </div>

      {seniority.alignment_reason && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{seniority.alignment_reason}</p>}
    </div>
  )
}
