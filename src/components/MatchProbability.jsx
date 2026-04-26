import React from 'react'

export default function MatchProbability({ probability, reasoning }) {
  if (probability === undefined || probability === null) return null
  const color = probability >= 60 ? '#4caf7d' : probability >= 35 ? '#f5a623' : '#ff4f4f'
  const label = probability >= 60 ? 'Worth applying' : probability >= 35 ? 'Long shot' : 'Unlikely'

  return (
    <div className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          🎯 Interview probability
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color, padding: '2px 8px', borderRadius: 20, background: `${color}18`, border: `1px solid ${color}30` }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 'clamp(20px,5vw,26px)', fontWeight: 700, fontFamily: 'Syne, sans-serif', color, minWidth: 60, lineHeight: 1 }}>
          {probability}%
        </div>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${probability}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
        </div>
      </div>
      {reasoning && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>{reasoning}</p>}
    </div>
  )
}
