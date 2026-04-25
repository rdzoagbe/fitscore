import React, { useState } from 'react'
import ScoreRing from './ScoreRing'
import VerdictBadge from './VerdictBadge'

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ color: '#555', fontSize: 14, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && <div style={{ padding: '0 18px 16px' }}>{children}</div>}
    </div>
  )
}

const Tag = ({ label, type }) => {
  const styles = {
    found:   { bg: 'rgba(76,175,125,0.12)',  color: '#4caf7d', border: 'rgba(76,175,125,0.2)' },
    missing: { bg: 'rgba(255,79,79,0.1)',    color: '#ff7070', border: 'rgba(255,79,79,0.2)' },
    nice:    { bg: 'rgba(245,166,35,0.1)',   color: '#f5a623', border: 'rgba(245,166,35,0.2)' },
  }
  const s = styles[type] || styles.found
  return <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'inline-block', margin: '3px 3px 3px 0' }}>{label}</span>
}

const ScoreBar = ({ label, score, color }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 13, color: '#888' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color }}>{score}%</span>
    </div>
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  </div>
)

export default function ResultsView({ data, onReset }) {
  const km = data.keyword_match || {}
  const req = data.requirements_check || {}
  const score = data.display_score ?? 0
  const jobUrl = data.job_url || null
  const isPassed = data.overall_verdict === 'likely_passed'

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>

      {/* Score card */}
      <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '24px 20px 20px', marginBottom: 10, textAlign: 'center' }}>
        <ScoreRing score={score} />
        {data.verdict && <p style={{ fontSize: 13, color: '#888', marginTop: 12, lineHeight: 1.5 }}>{data.verdict}</p>}
      </div>

      {/* Verdict */}
      <VerdictBadge verdict={data.overall_verdict} reason={data.overall_reason} />

      {/* Apply button — shown when likely passed */}
      {isPassed && jobUrl && (
        <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{
          display: 'block', width: '100%', padding: '14px', borderRadius: 14, marginBottom: 10,
          background: '#4caf7d', color: '#fff', border: 'none',
          fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', letterSpacing: '-0.01em', textAlign: 'center', textDecoration: 'none'
        }}>
          Apply for this job →
        </a>
      )}

      {/* Score breakdown */}
      <Section title="Score Breakdown">
        <ScoreBar label="Keyword match (60%)" score={km.score ?? 0} color="#7b8cff" />
        <ScoreBar label="Requirements match (40%)" score={req.score ?? 0} color="#4caf7d" />
        <p style={{ fontSize: 11, color: '#444', marginTop: 6, lineHeight: 1.5 }}>Weighted like most real ATS systems.</p>
      </Section>

      {/* Critical gaps */}
      {data.critical_gaps?.length > 0 && (
        <Section title={`⚠ Critical gaps (${data.critical_gaps.length})`}>
          {data.critical_gaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: i < data.critical_gaps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ color: '#ff4f4f', flexShrink: 0 }}>✗</span>
              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, margin: 0 }}>{g}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Quick wins — 2x2 grid */}
      {data.quick_wins?.length > 0 && (
        <Section title="Quick wins">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {data.quick_wins.map((w, i) => (
              <div key={i} style={{ background: 'rgba(200,245,66,0.05)', border: '1px solid rgba(200,245,66,0.12)', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#c8f542', display: 'block', marginBottom: 4 }}>#{i + 1}</span>
                <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{w}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Keywords */}
      <Section title="Keywords" defaultOpen={false}>
        {km.found?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#4caf7d', marginBottom: 6, fontWeight: 500 }}>✓ Found in your CV</p>
            <div>{km.found.map(k => <Tag key={k} label={k} type="found" />)}</div>
          </div>
        )}
        {km.missing_required?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#ff7070', marginBottom: 6, fontWeight: 500 }}>✗ Required — missing</p>
            <div>{km.missing_required.map(k => <Tag key={k} label={k} type="missing" />)}</div>
          </div>
        )}
        {km.missing_nice?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: '#f5a623', marginBottom: 6, fontWeight: 500 }}>○ Nice-to-have — missing</p>
            <div>{km.missing_nice.map(k => <Tag key={k} label={k} type="nice" />)}</div>
          </div>
        )}
      </Section>

      {/* Requirements */}
      <Section title="Requirements" defaultOpen={false}>
        {req.met?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: '#4caf7d', marginBottom: 6, fontWeight: 500 }}>✓ You meet these</p>
            {req.met.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#4caf7d', flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{r}</p>
              </div>
            ))}
          </div>
        )}
        {req.unmet?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: '#ff7070', marginBottom: 6, fontWeight: 500, marginTop: 10 }}>✗ You don't meet these</p>
            {req.unmet.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#ff7070', flexShrink: 0 }}>✗</span>
                <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{r}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Format warnings */}
      {data.format_warnings?.length > 0 && (
        <Section title="Format warnings" defaultOpen={false}>
          {data.format_warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < data.format_warnings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ color: '#f5a623', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5, margin: 0 }}>{w}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Saved + actions */}
      <div style={{ background: 'rgba(200,245,66,0.06)', border: '1px solid rgba(200,245,66,0.15)', borderRadius: 12, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>💾</span>
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Saved to your history.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: jobUrl ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 4 }}>
        <button onClick={onReset} style={{ padding: '14px', borderRadius: 12, background: '#c8f542', color: '#0f0f0f', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          New analysis
        </button>
        {jobUrl && !isPassed && (
          <a href={jobUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#888', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            View job anyway
          </a>
        )}
      </div>
    </div>
  )
}
