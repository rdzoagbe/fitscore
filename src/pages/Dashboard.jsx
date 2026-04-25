import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Dashboard({ onNewAnalysis, onSelectAnalysis }) {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setAnalyses(data || [])
    setLoading(false)
  }

  const deleteAnalysis = async (id, e) => {
    e.stopPropagation()
    await supabase.from('analyses').delete().eq('id', id)
    setAnalyses(prev => prev.filter(a => a.id !== id))
  }

  const scoreColor = (s) => s >= 80 ? '#4caf7d' : s >= 60 ? '#f5a623' : '#ff4f4f'
  const scoreLabel = (s) => s >= 80 ? 'Strong' : s >= 60 ? 'Partial' : 'Low'

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f' }}>
      <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 480, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: '#c8f542' }}>Score</span>
          </h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2, letterSpacing: '0.04em' }}>KNOW BEFORE YOU APPLY</p>
        </div>
        <button onClick={onNewAnalysis} style={{
          background: '#c8f542', border: 'none', borderRadius: 20,
          padding: '8px 18px', color: '#0f0f0f', fontSize: 13,
          fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer'
        }}>+ Analyze</button>
      </header>

      <main style={{ padding: '28px 20px 40px', maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 600, color: '#f0f0f0', marginBottom: 6 }}>Your analyses</h2>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>
          {user.email}
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 28, height: 28, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #c8f542', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {!loading && analyses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 15, color: '#666', marginBottom: 4 }}>No analyses yet</p>
            <p style={{ fontSize: 13, color: '#444' }}>Click "+ Analyze" to get started</p>
          </div>
        )}

        {!loading && analyses.map(a => (
          <div key={a.id} onClick={() => onSelectAnalysis(a)} style={{
            background: '#181818', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: '16px', marginBottom: 12, cursor: 'pointer',
            transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', gap: 14
          }}>
            {/* Score circle */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${scoreColor(a.score)}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `${scoreColor(a.score)}15`
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(a.score), fontFamily: 'Syne, sans-serif' }}>{a.score}%</span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.job_title || a.job_url?.replace(/https?:\/\//, '').slice(0, 40) || 'Job analysis'}
              </p>
              <p style={{ fontSize: 11, color: '#555' }}>
                {scoreLabel(a.score)} match · {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <button onClick={(e) => deleteAnalysis(a.id, e)} style={{
              background: 'none', border: 'none', color: '#444', cursor: 'pointer',
              fontSize: 16, padding: '4px 8px', flexShrink: 0
            }}>×</button>
          </div>
        ))}
      </main>
    </div>
  )
}
