import React from 'react'
import ScoreRing from './ScoreRing'
import VerdictBadge from './VerdictBadge'

const Section = ({ title, children }) => (
  <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</p>
    {children}
  </div>
)

const Tag = ({ label, type }) => {
  const styles = {
    found:    { bg: 'rgba(76,175,125,0.12)',  color: '#4caf7d', border: 'rgba(76,175,125,0.2)' },
    missing:  { bg: 'rgba(255,79,79,0.1)',    color: '#ff7070', border: 'rgba(255,79,79,0.2)' },
    nice:     { bg: 'rgba(245,166,35,0.1)',   color: '#f5a623', border: 'rgba(245,166,35,0.2)' },
    met:      { bg: 'rgba(76,175,125,0.12)',  color: '#4caf7d', border: 'rgba(76,175,125,0.2)' },
    unmet:    { bg: 'rgba(255,79,79,0.1)',    color: '#ff7070', border: 'rgba(255,79,79,0.2)' },
  }
  const s = styles[type] || styles.found
  return (
    <span style={{ fontSize: 12, padding: '4px 11px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'inline-block', margin: '3px 4px 3px 0' }}>
      {label}
    </span>
  )
}

const ScoreBar = ({ label, score, color }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
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

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>

      {/* Score + verdict */}
      <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '28px 20px', marginBottom: 14, textAlign: 'center' }}>
        <ScoreRing score={score} />
        {data.verdict && <p style={{ fontSize: 14, color: '#888', marginTop: 14, lineHeight: 1.5, maxWidth: 280, margin: '14px auto 0' }}>{data.verdict}</p>}
      </div>

      {/* Overall verdict */}
      <VerdictBadge verdict={data.overall_verdict} reason={data.overall_reason} />

      {/* Score breakdown */}
      <Section title="ATS Score Breakdown">
        <ScoreBar label="Keyword match" score={km.score ?? 0} color="#7b8cff" />
        <ScoreBar label="Requirements match" score={req.score ?? 0} color="#4caf7d" />
        <p style={{ fontSize: 11, color: '#444', marginTop: 8, lineHeight: 1.5 }}>
          Score = 60% keywords + 40% requirements — weighted like most real ATS systems.
        </p>
      </Section>

      {/* Critical gaps — shown first if any */}
      {data.critical_gaps?.length > 0 && (
        <Section title="⚠ Critical gaps — fix before applying">
          {data.critical_gaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < data.critical_gaps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span style={{ color: '#ff4f4f', flexShrink: 0, fontSize: 14 }}>✗</span>
              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.55 }}>{g}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Keywords */}
      <Section title="Keyword Analysis">
        {km.found?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#4caf7d', marginBottom: 8, fontWeight: 500 }}>✓ Found in your CV</p>
            <div>{km.found.map(k => <Tag key={k} label={k} type="found" />)}</div>
          </div>
        )}
        {km.missing_required?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#ff7070', marginBottom: 8, fontWeight: 500 }}>✗ Required — missing</p>
            <div>{km.missing_required.map(k => <Tag key={k} label={k} type="missing" />)}</div>
          </div>
        )}
        {km.missing_nice?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: '#f5a623', marginBottom: 8, fontWeight: 500 }}>○ Nice-to-have — missing</p>
            <div>{km.missing_nice.map(k => <Tag key={k} label={k} type="nice" />)}</div>
          </div>
        )}
      </Section>

      {/* Requirements */}
      <Section title="Requirements Check">
        {req.met?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: '#4caf7d', marginBottom: 8, fontWeight: 500 }}>✓ Requirements you meet</p>
            {req.met.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#4caf7d', flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{r}</p>
              </div>
            ))}
          </div>
        )}
        {req.unmet?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: '#ff7070', marginBottom: 8, fontWeight: 500, marginTop: 12 }}>✗ Requirements you don't meet</p>
            {req.unmet.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: '#ff7070', flexShrink: 0 }}>✗</span>
                <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{r}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Format warnings */}
      {data.format_warnings?.length > 0 && (
        <Section title="CV Format Warnings">
          <p style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 1.5 }}>
            Some ATS systems struggle with complex formatting. These issues may cause your CV to be misread.
          </p>
          {data.format_warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < data.format_warnings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ color: '#f5a623', flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.55 }}>{w}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Quick wins */}
      {data.quick_wins?.length > 0 && (
        <Section title="Quick wins — apply these now">
          {data.quick_wins.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < data.quick_wins.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span style={{ color: '#c8f542', flexShrink: 0, fontSize: 14, fontWeight: 700 }}>{i + 1}</span>
              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.55 }}>{w}</p>
            </div>
          ))}
        </Section>
      )}

      {/* Saved notice */}
      <div style={{ background: 'rgba(200,245,66,0.06)', border: '1px solid rgba(200,245,66,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>💾</span>
        <p style={{ fontSize: 13, color: '#888' }}>Analysis saved to your history.</p>
      </div>

      <button onClick={onReset} style={{ width: '100%', padding: '15px', borderRadius: 14, background: '#c8f542', color: '#0f0f0f', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}>
        Analyze another job →
      </button>
    </div>
  )
}
