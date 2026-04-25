import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function ScoreChart({ analyses }) {
  if (analyses.length < 2) return null
  const recent = [...analyses].reverse().slice(-8)
  const max = 100
  const w = 100 / (recent.length - 1)

  return (
    <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Score history</p>
      <svg viewBox="0 0 300 80" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Grid lines */}
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={80 - (y / max) * 70} x2="300" y2={80 - (y / max) * 70} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {/* Line */}
        <polyline
          fill="none"
          stroke="#c8f542"
          strokeWidth="2"
          strokeLinejoin="round"
          points={recent.map((a, i) => `${i * w * 3},${80 - (a.score / max) * 70}`).join(' ')}
        />
        {/* Dots */}
        {recent.map((a, i) => {
          const color = a.score >= 70 ? '#4caf7d' : a.score >= 50 ? '#f5a623' : '#ff4f4f'
          return (
            <g key={i}>
              <circle cx={i * w * 3} cy={80 - (a.score / max) * 70} r="4" fill={color} />
              <text x={i * w * 3} y={80 - (a.score / max) * 70 - 8} textAnchor="middle" fill="#888" fontSize="9">{a.score}%</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Dashboard({ onNewAnalysis, onSelectAnalysis }) {
  const { user, signOut } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAnalyses() }, [])

  const fetchAnalyses = async () => {
    const { data, error } = await supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (!error) setAnalyses(data || [])
    setLoading(false)
  }

  const deleteAnalysis = async (id, e) => {
    e.stopPropagation()
    await supabase.from('analyses').delete().eq('id', id)
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }

  const scoreColor = (s) => s >= 70 ? '#4caf7d' : s >= 50 ? '#f5a623' : '#ff4f4f'
  const verdictLabel = (v) => ({ likely_passed: 'Likely passed', borderline: 'Borderline', likely_filtered: 'Likely filtered' })[v] || ''
  const avgScore = analyses.length ? Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length) : null

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f' }}>
      <header style={{ padding: 'clamp(16px,4vw,24px) var(--side-pad) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 'var(--content-width)', margin: '0 auto' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(18px,4vw,22px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: '#c8f542' }}>Score</span>
          </h1>
          <p style={{ fontSize: 10, color: '#555', marginTop: 2, letterSpacing: '0.05em' }}>KNOW BEFORE YOU APPLY</p>
        </div>
        <button onClick={onNewAnalysis} style={{ background: '#c8f542', border: 'none', borderRadius: 20, padding: '8px 18px', color: '#0f0f0f', fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>+ Analyze</button>
      </header>

      <main style={{ padding: 'clamp(20px,4vw,32px) var(--side-pad) 60px', maxWidth: 'var(--content-width)', margin: '0 auto' }}>

        {/* User info + stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#f0f0f0' }}>
              {user.email?.split('@')[0]}
            </p>
            <p style={{ fontSize: 12, color: '#555' }}>{analyses.length} analyse{analyses.length !== 1 ? 's' : ''}{avgScore !== null ? ` · avg ${avgScore}%` : ''}</p>
          </div>
          <button onClick={signOut} style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer' }}>Sign out</button>
        </div>

        {/* Score chart */}
        {!loading && <ScoreChart analyses={analyses} />}

        {/* Skeleton loading */}
        {loading && [1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16, marginBottom: 10 }} />
        ))}

        {/* Empty state */}
        {!loading && analyses.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'clamp(40px,10vw,80px) 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 6 }}>No analyses yet</p>
            <p style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>Run your first ATS check to see your results here</p>
            <button onClick={onNewAnalysis} style={{ background: '#c8f542', border: 'none', borderRadius: 12, padding: '12px 24px', color: '#0f0f0f', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Start analyzing →</button>
          </div>
        )}

        {/* Analysis list */}
        {!loading && analyses.map(a => (
          <div key={a.id} onClick={() => onSelectAnalysis(a)} style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 'clamp(12px,3vw,16px)', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, border: `2px solid ${scoreColor(a.score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${scoreColor(a.score)}15` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(a.score), fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{a.score}%</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 'clamp(12px,3vw,13px)', fontWeight: 500, color: '#f0f0f0', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.job_title || new URL(a.job_url).hostname.replace('www.', '')}
              </p>
              <p style={{ fontSize: 11, color: '#555' }}>
                {verdictLabel(a.result?.overall_verdict)} · {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </p>
            </div>
            <button onClick={(e) => deleteAnalysis(a.id, e)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 18, padding: '4px 8px', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff7070'}
              onMouseLeave={e => e.currentTarget.style.color = '#333'}
            >×</button>
          </div>
        ))}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <a href="/privacy" style={{ fontSize: 11, color: '#333', textDecoration: 'none' }}>Privacy & RGPD</a>
        </div>
      </main>
    </div>
  )
}
