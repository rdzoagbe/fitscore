import React, { useState } from 'react'
import ScoreRing from './ScoreRing'
import VerdictBadge from './VerdictBadge'

const Tag = ({ label, type }) => {
  const styles = {
    found:   { bg: 'rgba(76,175,125,0.12)',  color: '#4caf7d', border: 'rgba(76,175,125,0.2)' },
    missing: { bg: 'rgba(255,79,79,0.1)',    color: '#ff7070', border: 'rgba(255,79,79,0.2)' },
    nice:    { bg: 'rgba(245,166,35,0.1)',   color: '#f5a623', border: 'rgba(245,166,35,0.2)' },
  }
  const s = styles[type] || styles.found
  return <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'inline-block', margin: '2px 2px 2px 0' }}>{label}</span>
}

const MiniCard = ({ title, children, accent }) => {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} style={{ background: '#181818', border: `1px solid ${open ? (accent || 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}>
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: open ? (accent || '#888') : '#555', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ color: '#444', fontSize: 11, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </div>
      {open && <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>{children}</div>}
    </div>
  )
}

export default function ResultsView({ data, onReset }) {
  const km = data.keyword_match || {}
  const req = data.requirements_check || {}
  const score = data.display_score ?? 0
  const jobUrl = data.job_url || null
  const isPassed = data.overall_verdict === 'likely_passed'

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>

      {/* TOP CARD — ring left, text right */}
      <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 'clamp(16px,4vw,28px)', marginBottom: 10 }}>
        <div className="top-card-inner" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ flexShrink: 0 }}>
            <ScoreRing score={score} size={clamp(90, 110)} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>ATS Score</p>
            <p style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff4f4f', marginBottom: 6 }}>{score}%</p>
            {data.verdict && <p style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#888', lineHeight: 1.5, margin: 0 }}>{data.verdict}</p>}
          </div>
        </div>
        <VerdictBadge verdict={data.overall_verdict} reason={data.overall_reason} />
      </div>

      {/* Apply button if passed */}
      {isPassed && jobUrl && (
        <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 14, marginBottom: 10, background: '#4caf7d', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(13px,3.5vw,15px)', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
          Apply for this job →
        </a>
      )}

      {/* 4 MINI CARDS — 2x2 responsive grid */}
      <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>

        <MiniCard title="Score" accent="#7b8cff">
          <div style={{ marginTop: 10 }}>
            {[['Keywords (60%)', km.score ?? 0, '#7b8cff'], ['Requirements (40%)', req.score ?? 0, '#4caf7d']].map(([label, val, color]) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color }}>{val}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </MiniCard>

        <MiniCard title={`Gaps${data.critical_gaps?.length ? ` (${data.critical_gaps.length})` : ''}`} accent="#ff4f4f">
          <div style={{ marginTop: 10 }}>
            {data.critical_gaps?.length > 0 ? data.critical_gaps.map((g, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <span style={{ color: '#ff4f4f', flexShrink: 0, fontSize: 11 }}>✗</span>
                <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{g}</p>
              </div>
            )) : <p style={{ fontSize: 11, color: '#4caf7d', marginTop: 8 }}>✓ No critical gaps found</p>}
          </div>
        </MiniCard>

        <MiniCard title="Keywords" accent="#c8f542">
          <div style={{ marginTop: 10 }}>
            {km.found?.length > 0 && <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: '#4caf7d', marginBottom: 4, fontWeight: 600 }}>FOUND</p>
              {km.found.slice(0, 5).map(k => <Tag key={k} label={k} type="found" />)}
            </div>}
            {km.missing_required?.length > 0 && <div>
              <p style={{ fontSize: 10, color: '#ff7070', marginBottom: 4, fontWeight: 600 }}>MISSING</p>
              {km.missing_required.slice(0, 4).map(k => <Tag key={k} label={k} type="missing" />)}
            </div>}
            {km.missing_nice?.length > 0 && <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, color: '#f5a623', marginBottom: 4, fontWeight: 600 }}>NICE TO HAVE</p>
              {km.missing_nice.slice(0, 3).map(k => <Tag key={k} label={k} type="nice" />)}
            </div>}
          </div>
        </MiniCard>

        <MiniCard title="Requirements" accent="#f5a623">
          <div style={{ marginTop: 10 }}>
            {req.met?.length > 0 && <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: '#4caf7d', marginBottom: 4, fontWeight: 600 }}>MET</p>
              {req.met.slice(0, 3).map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#4caf7d', fontSize: 11, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: 11, color: '#aaa', margin: 0, lineHeight: 1.4 }}>{r}</p>
                </div>
              ))}
            </div>}
            {req.unmet?.length > 0 && <div>
              <p style={{ fontSize: 10, color: '#ff7070', marginBottom: 4, fontWeight: 600 }}>UNMET</p>
              {req.unmet.slice(0, 3).map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: '#ff7070', fontSize: 11, flexShrink: 0 }}>✗</span>
                  <p style={{ fontSize: 11, color: '#aaa', margin: 0, lineHeight: 1.4 }}>{r}</p>
                </div>
              ))}
            </div>}
          </div>
        </MiniCard>
      </div>

      {/* QUICK WINS — full width */}
      {data.quick_wins?.length > 0 && (
        <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Quick wins</p>
          <div className="quick-wins-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {data.quick_wins.map((w, i) => (
              <div key={i} style={{ background: 'rgba(200,245,66,0.05)', border: '1px solid rgba(200,245,66,0.12)', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#c8f542', display: 'block', marginBottom: 4 }}>#{i + 1}</span>
                <p style={{ fontSize: 'clamp(11px,2.5vw,13px)', color: '#aaa', lineHeight: 1.5, margin: 0 }}>{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format warnings */}
      {data.format_warnings?.filter(w => w && w.length > 5).length > 0 && (
        <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#f5a623', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Format warnings</p>
          {data.format_warnings.filter(w => w && w.length > 5).map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: '#f5a623', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Saved */}
      <div style={{ background: 'rgba(200,245,66,0.04)', border: '1px solid rgba(200,245,66,0.1)', borderRadius: 10, padding: '9px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>💾</span>
        <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Saved to your history.</p>
      </div>

      {/* BOTTOM BUTTONS */}
      <div className="btn-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onReset} style={{ padding: 'clamp(12px,3vw,15px)', borderRadius: 12, background: '#c8f542', color: '#0f0f0f', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(13px,3vw,15px)', fontWeight: 700, cursor: 'pointer' }}>
          New analysis
        </button>
        {jobUrl && (
          <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ padding: 'clamp(12px,3vw,15px)', borderRadius: 12, background: isPassed ? '#4caf7d' : 'transparent', color: isPassed ? '#fff' : '#888', border: isPassed ? 'none' : '1px solid rgba(255,255,255,0.12)', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(13px,3vw,15px)', fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPassed ? 'Apply now →' : 'View job'}
          </a>
        )}
      </div>
    </div>
  )
}

function clamp(min, max) {
  if (typeof window === 'undefined') return max
  return Math.min(max, Math.max(min, window.innerWidth * 0.28))
}
