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
    <div style={{ background: '#181818', border: `1px solid ${open ? (accent || 'rgba(255,255,255,0.12)') : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: open ? (accent || '#888') : '#555', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ color: '#444', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
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

      {/* TOP CARD: Score ring left + text right */}
      <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Left: ring */}
          <div style={{ flexShrink: 0 }}>
            <ScoreRing score={score} size={110} />
          </div>
          {/* Right: text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>ATS Score</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff4f4f', marginBottom: 6 }}>{score}%</p>
            {data.verdict && <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5, margin: 0 }}>{data.verdict}</p>}
          </div>
        </div>

        {/* Verdict badge inside top card */}
        <div style={{ marginTop: 16 }}>
          <VerdictBadge verdict={data.overall_verdict} reason={data.overall_reason} />
        </div>
      </div>

      {/* Apply button if passed */}
      {isPassed && jobUrl && (
        <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '14px', borderRadius: 14, marginBottom: 10, background: '#4caf7d', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
          Apply for this job →
        </a>
      )}

      {/* 4 EQUAL MINI CARDS in a 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>

        {/* Score breakdown */}
        <MiniCard title="Score" accent="#7b8cff">
          <div style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#666' }}>Keywords</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7b8cff' }}>{km.score ?? 0}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${km.score ?? 0}%`, background: '#7b8cff', borderRadius: 2 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#666' }}>Requirements</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#4caf7d' }}>{req.score ?? 0}%</span>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${req.score ?? 0}%`, background: '#4caf7d', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </MiniCard>

        {/* Critical gaps */}
        <MiniCard title={`Gaps${data.critical_gaps?.length ? ` (${data.critical_gaps.length})` : ''}`} accent="#ff4f4f">
          {data.critical_gaps?.length > 0 ? (
            <div style={{ marginTop: 10 }}>
              {data.critical_gaps.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <span style={{ color: '#ff4f4f', flexShrink: 0, fontSize: 11 }}>✗</span>
                  <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{g}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#4caf7d', marginTop: 10 }}>✓ No critical gaps</p>
          )}
        </MiniCard>

        {/* Keywords */}
        <MiniCard title="Keywords" accent="#c8f542">
          <div style={{ marginTop: 10 }}>
            {km.found?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: '#4caf7d', marginBottom: 4, fontWeight: 600 }}>FOUND</p>
                <div>{km.found.slice(0, 5).map(k => <Tag key={k} label={k} type="found" />)}</div>
              </div>
            )}
            {km.missing_required?.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: '#ff7070', marginBottom: 4, fontWeight: 600 }}>MISSING</p>
                <div>{km.missing_required.slice(0, 4).map(k => <Tag key={k} label={k} type="missing" />)}</div>
              </div>
            )}
          </div>
        </MiniCard>

        {/* Requirements */}
        <MiniCard title="Requirements" accent="#f5a623">
          <div style={{ marginTop: 10 }}>
            {req.met?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, color: '#4caf7d', marginBottom: 4, fontWeight: 600 }}>MET</p>
                {req.met.slice(0, 3).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: '#4caf7d', fontSize: 11, flexShrink: 0 }}>✓</span>
                    <p style={{ fontSize: 11, color: '#aaa', margin: 0, lineHeight: 1.4 }}>{r}</p>
                  </div>
                ))}
              </div>
            )}
            {req.unmet?.length > 0 && (
              <div>
                <p style={{ fontSize: 10, color: '#ff7070', marginBottom: 4, fontWeight: 600 }}>UNMET</p>
                {req.unmet.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: '#ff7070', fontSize: 11, flexShrink: 0 }}>✗</span>
                    <p style={{ fontSize: 11, color: '#aaa', margin: 0, lineHeight: 1.4 }}>{r}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </MiniCard>
      </div>

      {/* QUICK WINS — full width */}
      {data.quick_wins?.length > 0 && (
        <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Quick wins</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {data.quick_wins.map((w, i) => (
              <div key={i} style={{ background: 'rgba(200,245,66,0.05)', border: '1px solid rgba(200,245,66,0.12)', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#c8f542', display: 'block', marginBottom: 4 }}>#{i + 1}</span>
                <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Format warnings if any */}
      {data.format_warnings?.length > 0 && (
        <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#f5a623', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Format warnings</p>
          {data.format_warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: '#f5a623', flexShrink: 0, fontSize: 12 }}>⚠</span>
              <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Saved notice */}
      <div style={{ background: 'rgba(200,245,66,0.04)', border: '1px solid rgba(200,245,66,0.1)', borderRadius: 10, padding: '9px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13 }}>💾</span>
        <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Saved to your history.</p>
      </div>

      {/* BOTTOM BUTTONS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onReset} style={{ padding: '14px', borderRadius: 12, background: '#c8f542', color: '#0f0f0f', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          New analysis
        </button>
        {jobUrl && (
          <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '14px', borderRadius: 12, background: 'transparent', color: '#888', border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPassed ? 'Apply now →' : 'View job anyway'}
          </a>
        )}
      </div>
    </div>
  )
}
