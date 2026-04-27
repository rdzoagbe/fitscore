import React from 'react'
import ScoreRing from './ScoreRing'
import VerdictBadge from './VerdictBadge'
import { useLang } from '../context/LangContext'

export default function FitScoreCard({ data, scoreDelta }) {
  const { t } = useLang()
  const atsScore = data.display_score ?? 0
  const matchProb = data.match_probability ?? 0
  // Unified FitScore: weighted blend of ATS pass-through + match probability
  // 60% ATS (gets you past the filter) + 40% match (interview likelihood)
  const fitscore = Math.round((atsScore * 0.6) + (matchProb * 0.4))
  const color = fitscore >= 70 ? '#4caf7d' : fitscore >= 50 ? '#f5a623' : '#ff6b6b'

  // Friendly label
  const label = fitscore >= 75
    ? (t('fitscore_strong') || 'Strong fit')
    : fitscore >= 60
    ? (t('fitscore_solid') || 'Solid fit')
    : fitscore >= 45
    ? (t('fitscore_borderline') || 'Borderline')
    : (t('fitscore_weak') || 'Weak fit')

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      {/* Top row: ring + main number + delta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px,3vw,20px)', marginBottom: 14 }}>
        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={fitscore} size={100} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {t('your_fitscore') || 'Your FitScore'}
            </p>
            {scoreDelta !== null && scoreDelta !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: scoreDelta >= 0 ? 'rgba(76,175,125,0.15)' : 'rgba(255,107,107,0.15)', color: scoreDelta >= 0 ? '#4caf7d' : '#ff6b6b', border: `1px solid ${scoreDelta >= 0 ? 'rgba(76,175,125,0.3)' : 'rgba(255,107,107,0.3)'}` }}>
                {scoreDelta >= 0 ? '↑' : '↓'} {scoreDelta >= 0 ? '+' : ''}{scoreDelta} {t('from_last_run') || 'from last run'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 'clamp(26px,6vw,34px)', fontWeight: 700, fontFamily: 'Syne, sans-serif', color, marginBottom: 4, lineHeight: 1, animation: 'pop 0.5s ease' }}>
            {fitscore}<span style={{ fontSize: '0.55em', color: 'var(--text-muted)', fontWeight: 500 }}> / 100</span>
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color, fontFamily: 'Syne, sans-serif' }}>{label}</p>
        </div>
      </div>

      {/* Sub-breakdown: shows the two contributing scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              🛡 {t('ats_passthrough') || 'ATS pass-through'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: atsScore >= 70 ? '#4caf7d' : atsScore >= 50 ? '#f5a623' : '#ff6b6b', fontFamily: 'Syne, sans-serif' }}>
              {atsScore}%
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${atsScore}%`, background: atsScore >= 70 ? '#4caf7d' : atsScore >= 50 ? '#f5a623' : '#ff6b6b', borderRadius: 2, transition: 'width 0.8s ease' }} />
          </div>
        </div>

        <div style={{ padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              🎯 {t('interview_chance') || 'Interview chance'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: matchProb >= 60 ? '#4caf7d' : matchProb >= 35 ? '#f5a623' : '#ff6b6b', fontFamily: 'Syne, sans-serif' }}>
              {matchProb}%
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${matchProb}%`, background: matchProb >= 60 ? '#4caf7d' : matchProb >= 35 ? '#f5a623' : '#ff6b6b', borderRadius: 2, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      <VerdictBadge verdict={data.overall_verdict} reason={data.overall_reason} />

      {/* Match reasoning if present */}
      {data.match_reasoning && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.6, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: 8 }}>
          💡 {data.match_reasoning}
        </p>
      )}
    </div>
  )
}
