import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

function ScoreChart({ analyses }) {
  if (analyses.length < 2) return null
  const recent = [...analyses].reverse().slice(-8)
  const w = 280 / (recent.length - 1)
  return (
    <div style={{ marginBottom: 6 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Score history</p>
      <svg viewBox="0 0 280 70" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {[25,50,75].map(y => <line key={y} x1="0" y1={70-(y/100)*60} x2="280" y2={70-(y/100)*60} stroke="var(--border)" strokeWidth="1"/>)}
        <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"
          points={recent.map((a,i) => `${i*w},${70-(a.score/100)*60}`).join(' ')} />
        {recent.map((a,i) => {
          const color = a.score>=70?'#4caf7d':a.score>=50?'#f5a623':'#ff4f4f'
          return (
            <g key={i}>
              <circle cx={i*w} cy={70-(a.score/100)*60} r="4" fill={color} stroke="var(--bg-card)" strokeWidth="1.5"/>
              <text x={i*w} y={70-(a.score/100)*60-9} textAnchor="middle" fill="var(--text-muted)" fontSize="8">{a.score}%</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ProgressBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function Dashboard({ onNewAnalysis, onSelectAnalysis }) {
  const { user, signOut } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [filter, setFilter] = useState('all') // all | passed | borderline | filtered
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAnalyses() }, [])

  const fetchAnalyses = async () => {
    const { data, error } = await supabase
      .from('analyses').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
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

  const scoreColor = s => s>=70?'#4caf7d':s>=50?'#f5a623':'#ff4f4f'
  const verdictLabel = v => ({ likely_passed:'Likely passed', borderline:'Borderline', likely_filtered:'Likely filtered' })[v] || 'Analysed'

  const avgScore = analyses.length ? Math.round(analyses.reduce((s,a) => s+a.score,0)/analyses.length) : null
  const bestScore = analyses.length ? Math.max(...analyses.map(a=>a.score)) : null
  const passedCount = analyses.filter(a => a.result?.overall_verdict === 'likely_passed').length

  // Filter + search
  const filtered = analyses.filter(a => {
    const matchFilter = filter === 'all' || a.result?.overall_verdict === filter
    const matchSearch = !search || (a.job_title||'').toLowerCase().includes(search.toLowerCase()) || (a.job_url||'').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'likely_passed', label: '✓ Passed' },
    { value: 'borderline', label: '⚡ Borderline' },
    { value: 'likely_filtered', label: '✗ Filtered' },
  ]

  return (
    <div className="page page-enter">
      {/* Header */}
      <header className="page-header">
        <div>
          <div className="logo">Fit<span className="acc">Score</span></div>
          <div className="tagline">KNOW BEFORE YOU APPLY</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle />
          <button onClick={onNewAnalysis} style={{ background: 'var(--accent)', border: 'none', borderRadius: 20, padding: '9px 20px', color: '#0f0f0f', fontSize: 13, fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
            + Analyze
          </button>
        </div>
      </header>

      <main className="page-main">

        {/* User info row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 'clamp(16px,4vw,20px)', fontWeight: 600, fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)', marginBottom: 3 }}>
              {user.email?.split('@')[0]}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {analyses.length} analys{analyses.length!==1?'es':'e'}
              {avgScore!==null ? ` · avg ${avgScore}%` : ''}
              {passedCount > 0 ? ` · ${passedCount} passed` : ''}
            </p>
          </div>
          <button onClick={signOut} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '7px 16px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>

        {/* Stats cards */}
        {!loading && analyses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Avg score', value: `${avgScore}%`, color: scoreColor(avgScore) },
              { label: 'Best score', value: `${bestScore}%`, color: scoreColor(bestScore) },
              { label: 'Passed', value: `${passedCount}/${analyses.length}`, color: '#4caf7d' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
                <p style={{ fontSize: 'clamp(16px,4vw,22px)', fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif', marginBottom: 3 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {!loading && analyses.length >= 2 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <ScoreChart analyses={analyses} />
          </div>
        )}

        {/* Progress breakdown */}
        {!loading && analyses.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Verdict breakdown</p>
            <ProgressBar label="Likely passed" value={Math.round((analyses.filter(a=>a.result?.overall_verdict==='likely_passed').length/analyses.length)*100)} color="#4caf7d" />
            <ProgressBar label="Borderline" value={Math.round((analyses.filter(a=>a.result?.overall_verdict==='borderline').length/analyses.length)*100)} color="#f5a623" />
            <ProgressBar label="Likely filtered" value={Math.round((analyses.filter(a=>a.result?.overall_verdict==='likely_filtered').length/analyses.length)*100)} color="#ff4f4f" />
          </div>
        )}

        {/* Search */}
        {!loading && analyses.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <input type="text" placeholder="🔍  Search by job title..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 10 }} />

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)} style={{
                  padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter===f.value?'var(--accent)':'var(--border)'}`,
                  background: filter===f.value?'rgba(200,245,66,0.12)':'var(--bg-input)',
                  color: filter===f.value?'var(--accent)':'var(--text-secondary)',
                  fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
                }}>{f.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton */}
        {loading && [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8 }} />)}

        {/* Empty state */}
        {!loading && analyses.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'clamp(48px,10vw,80px) 24px', background: 'var(--bg-input)', borderRadius: 18, border: '1px dashed var(--border)' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>No analyses yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.6 }}>Run your first ATS check to start tracking your progress</p>
            <button onClick={onNewAnalysis} className="btn-primary">Start analyzing →</button>
          </div>
        )}

        {/* No results from filter */}
        {!loading && analyses.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
            No analyses match your filter.
          </div>
        )}

        {/* History list */}
        {!loading && filtered.length > 0 && (
          <div className="history-grid">
            {filtered.map(a => {
              const color = scoreColor(a.score)
              const verdict = verdictLabel(a.result?.overall_verdict)
              const date = new Date(a.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
              const title = a.job_title || (() => { try { return new URL(a.job_url).hostname.replace('www.','') } catch { return 'Job analysis' } })()

              return (
                <div key={a.id} onClick={() => onSelectAnalysis(a)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 'clamp(12px,3vw,16px)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-focus)'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}
                >
                  {/* Score ring */}
                  <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${color}12` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{a.score}%</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
                    {a.result?.job_context?.company && a.result.job_context.company !== 'Not specified' && (
                      <p style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@ {a.result.job_context.company}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}30` }}>{verdict}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{date}</span>
                      {a.result?.job_context?.location && a.result.job_context.location !== 'Not specified' && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· 📍 {a.result.job_context.location.split(',')[0]}</span>
                      )}
                    </div>
                  </div>

                  <button onClick={e => deleteAnalysis(a.id, e)} disabled={deleting===a.id}
                    style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: 18, padding: '4px 6px', flexShrink: 0, transition: 'color 0.15s', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color='#ff7070'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--border)'}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <a href="/privacy" style={{ fontSize: 11, color: 'var(--text-hint)', textDecoration: 'none' }}>Privacy & RGPD</a>
        </div>
      </main>
    </div>
  )
}
