import React from 'react'

const config = {
  likely_passed:   { label: 'Likely to pass ATS',              color: '#4caf7d', bg: 'rgba(76,175,125,0.1)',  border: 'rgba(76,175,125,0.25)',  icon: '✓' },
  borderline:      { label: 'Borderline — improve first',       color: '#f5a623', bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.25)',  icon: '⚡' },
  likely_filtered: { label: 'Likely filtered out',             color: '#ff4f4f', bg: 'rgba(255,79,79,0.1)',   border: 'rgba(255,79,79,0.25)',   icon: '✗' },
}

export default function VerdictBadge({ verdict, reason }) {
  const c = config[verdict] || config.borderline
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: reason ? 5 : 0 }}>
        <span style={{ fontSize: 16, color: c.color }}>{c.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: c.color, fontFamily: 'Syne, sans-serif' }}>{c.label}</span>
      </div>
      {reason && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginLeft: 24 }}>{reason}</p>}
    </div>
  )
}
