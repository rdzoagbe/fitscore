import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function ScoreChart({ analyses }) {
  if (analyses.length < 2) return null
  const recent = [...analyses].reverse().slice(-8)
  const w = 280 / (recent.length - 1)
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Score history</p>
      <svg viewBox="0 0 280 70" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={70-(y/100)*60} x2="280" y2={70-(y/100)*60} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        ))}
        <polyline fill="none" stroke="#c8f542" strokeWidth="2" strokeLinejoin="round"
          points={recent.map((a,i) => `${i*w},${70-(a.score/100)*60}`).join(' ')} />
        {recent.map((a, i) => {
          const color = a.score>=70?'#4caf7d':a.score>=50?'#f5a623':'#ff4f4f'
          return (
            <g key={i}>
              <circle cx={i*w} cy={70-(a.score/100)*60} r="4" fill={color} stroke="#0f0f0f" strokeWidth="1.5"/>
              <text x={i*w} y={70-(a.score/100)*60-9} textAnchor="middle" fill="#666" fontSize="8">{a.score}%</text>
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
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { fetchAnalyses() }, [])

  const fetchAnalyses = async () => {
    const { data, error } = await supabase
      .from('analyses').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setAnalyses(data || [])
    setLoading(false)
  }

  const deleteAnalysis = async (id, e) => {
    e.stopPropagation()
    setDeleting(id)
    await supabase.from('analyses').delete().eq('id', id)
    setAnalyses(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const scoreColor = s => s >= 70 ? '#4caf7d' : s >= 50 ? '#f5a623' : '#ff4f4f'
  const verdictLabel = v => ({
    likely_passed: 'Likely passed',
    borderline: 'Borderline',
    likely_filtered: 'Likely filtered'
  })[v] || 'Analysed'

  const avgScore = analyses.length
    ? Math.round(analyses.reduce((s,a) => s+a.score, 0) / analyses.length)
    : null

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f' }}>

      {/* Header */}
      <header style={{ padding: 'clamp(18px,4vw,28px) clamp(18px,5vw,48px) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(18px,4vw,22px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: '#c8f542' }}>Score</span>
          </div>
          <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.05em' }}>KNOW BEFORE YOU APPLY</div>
        </div>
        <button onClick={onNewAnalysis} style={{ background: '#c8f542', border: 'none', borderRadius: 20, padding: '9px 22px', color: '#0f0f0f', fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
          + Analyze
        </button>
      </header>

      <main style={{ padding: 'clamp(20px,4vw,36px) clamp(18px,5vw,48px) 80px', maxWidth: 900, margin: '0 auto' }}>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 'clamp(16px,4vw,20px)', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#f0f0f0', marginBottom: 3 }}>
              {user.email?.split('@')[0]}
            </p>
            <p style={{ fontSize: 12, color: '#555' }}>
              {analyses.length} analys{analyses.length !== 1 ? 'es' : 'e'}
              {avgScore !== null ? ` · avg ${avgScore}%` : ''}
            </p>
          </div>
          <button onClick={signOut} style={{ fontSize: 12, color: '#666', background: 'none', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '7px 16px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>

        {/* Chart card */}
        {!loading && analyses.length >= 2 && (
          <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '18px 20px', marginBottom: 16 }}>
            <ScoreChart analyses={analyses} />
          </div>
        )}

        {/* Skeleton loading */}
        {loading && [1,2,3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 16, marginBottom: 10, background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        ))}

        {/* Empty state */}
        {!loading && analyses.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'clamp(48px,10vw,80px) 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>No analyses yet</p>
            <p style={{ fontSize: 13, color: '#444', marginBottom: 22, lineHeight: 1.6 }}>Run your first ATS check to start tracking your progress</p>
            <button onClick={onNewAnalysis} style={{ background: '#c8f542', border: 'none', borderRadius: 12, padding: '12px 28px', color: '#0f0f0f', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Start analyzing →
            </button>
          </div>
        )}

        {/* Analysis cards */}
        {!loading && analyses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,320px),1fr))', gap: 10 }}>
            {analyses.map(a => {
              const color = scoreColor(a.score)
              const verdict = verdictLabel(a.result?.overall_verdict)
              const date = new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
              const title = a.job_title || (() => { try { return new URL(a.job_url).hostname.replace('www.','') } catch { return 'Job analysis' } })()

              return (
                <div key={a.id} onClick={() => onSelectAnalysis(a)}
                  style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s', position: 'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.14)'; e.currentTarget.style.background='#1e1e1e' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.background='#181818' }}
                >
                  {/* Score circle */}
                  <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${color}12` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{a.score}%</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}30` }}>
                        {verdict}
                      </span>
                      <span style={{ fontSize: 11, color: '#444' }}>·</span>
                      <span style={{ fontSize: 11, color: '#555' }}>{date}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={e => deleteAnalysis(a.id, e)}
                    disabled={deleting === a.id}
                    style={{ background: 'none', border: 'none', color: deleting === a.id ? '#333' : '#2a2a2a', cursor: 'pointer', fontSize: 18, padding: '4px 6px', flexShrink: 0, transition: 'color 0.15s', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color='#ff7070'}
                    onMouseLeave={e => e.currentTarget.style.color='#2a2a2a'}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <a href="/privacy" style={{ fontSize: 11, color: '#333', textDecoration: 'none' }}>Privacy & RGPD</a>
        </div>
      </main>
    </div>
  )
}
