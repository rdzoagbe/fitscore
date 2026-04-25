import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function ScoreChart({ analyses }) {
  if (analyses.length < 2) return null
  const recent = [...analyses].reverse().slice(-8)
  const w = 300 / (recent.length - 1)
  return (
    <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Score history</p>
      <svg viewBox="0 0 300 80" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {[25, 50, 75].map(y => <line key={y} x1="0" y1={80-(y/100)*70} x2="300" y2={80-(y/100)*70} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
        <polyline fill="none" stroke="#c8f542" strokeWidth="2" strokeLinejoin="round"
          points={recent.map((a,i) => `${i*w},${80-(a.score/100)*70}`).join(' ')} />
        {recent.map((a,i) => {
          const color = a.score>=70?'#4caf7d':a.score>=50?'#f5a623':'#ff4f4f'
          return (
            <g key={i}>
              <circle cx={i*w} cy={80-(a.score/100)*70} r="4" fill={color}/>
              <text x={i*w} y={80-(a.score/100)*70-8} textAnchor="middle" fill="#888" fontSize="9">{a.score}%</text>
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

  const scoreColor = s => s >= 70 ? '#4caf7d' : s >= 50 ? '#f5a623' : '#ff4f4f'
  const verdictLabel = v => ({ likely_passed: 'Likely passed', borderline: 'Borderline', likely_filtered: 'Likely filtered' })[v] || ''
  const avgScore = analyses.length ? Math.round(analyses.reduce((s,a) => s+a.score, 0) / analyses.length) : null

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <div className="logo">Fit<span className="acc">Score</span></div>
          <div className="tagline">KNOW BEFORE YOU APPLY</div>
        </div>
        <button onClick={onNewAnalysis} style={{ background: '#c8f542', border: 'none', borderRadius: 20, padding: '8px 20px', color: '#0f0f0f', fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>+ Analyze</button>
      </header>

      <main className="page-main">
        {/* User stats row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#f0f0f0', marginBottom: 2 }}>
              {user.email?.split('@')[0]}
            </p>
            <p style={{ fontSize: 12, color: '#555' }}>
              {analyses.length} analyse{analyses.length !== 1 ? 's' : ''}{avgScore !== null ? ` · avg score ${avgScore}%` : ''}
            </p>
          </div>
          <button onClick={signOut} style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '6px 14px', cursor: 'pointer' }}>Sign out</button>
        </div>

        {/* Score chart */}
        {!loading && <ScoreChart analyses={analyses} />}

        {/* Skeleton */}
        {loading && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />)}

        {/* Empty state */}
        {!loading && analyses.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'clamp(40px,8vw,80px) 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 6 }}>No analyses yet</p>
            <p style={{ fontSize: 13, color: '#444', marginBottom: 20 }}>Run your first ATS check to track your progress</p>
            <button onClick={onNewAnalysis} style={{ background: '#c8f542', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#0f0f0f', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Start analyzing →</button>
          </div>
        )}

        {/* History list — 2 col on desktop */}
        {!loading && analyses.length > 0 && (
          <div className="history-list">
            {analyses.map(a => (
              <div key={a.id} onClick={() => onSelectAnalysis(a)}
                style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 'clamp(12px,3vw,16px)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
              >
                <div style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0, border: `2px solid ${scoreColor(a.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${scoreColor(a.score)}15` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(a.score), fontFamily: 'Syne, sans-serif' }}>{a.score}%</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.job_title || (() => { try { return new URL(a.job_url).hostname.replace('www.','') } catch { return 'Job analysis' } })()}
                  </p>
                  <p style={{ fontSize: 11, color: '#555' }}>{verdictLabel(a.result?.overall_verdict)} · {new Date(a.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}</p>
                </div>
                <button onClick={e => deleteAnalysis(a.id, e)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 18, padding: '4px 8px', flexShrink: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#ff7070'}
                  onMouseLeave={e => e.currentTarget.style.color='#333'}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 36 }}>
          <a href="/privacy" style={{ fontSize: 11, color: '#333', textDecoration: 'none' }}>Privacy & RGPD</a>
        </div>
      </main>
    </div>
  )
}
