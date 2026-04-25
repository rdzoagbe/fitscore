import React, { useState, useRef, useCallback } from 'react'
import { useAuth } from './context/AuthContext'
import { useAnalyze } from './hooks/useAnalyze'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PrivacyPage from './pages/PrivacyPage'
import ScoreRing from './components/ScoreRing'
import CategoryBars from './components/CategoryBars'
import KeywordTags from './components/KeywordTags'
import AdviceList from './components/AdviceList'

const LOADING_MSGS = [
  'Fetching job posting...',
  'Reading your CV...',
  'Running ATS simulation...',
  'Calculating your score...'
]
const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']

function AnalyzerPage({ onBack, onViewDashboard, prefillAnalysis }) {
  const [jobUrl, setJobUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user, signOut } = useAuth()
  const { status, data, error, analyze, reset } = useAnalyze()

  // If coming from dashboard with a saved analysis, show it directly
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)

  const isValidUrl = (str) => { try { new URL(str); return true } catch { return false } }

  const handleFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert('Please upload a PDF or Word (.docx) file.'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum 10MB.'); return }
    setCvFile(file)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0])
  }, [])

  const handleAnalyze = async () => {
    if (!jobUrl.trim() || !cvFile) return
    setViewingAnalysis(null)
    intervalRef.current = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 1800)
    await analyze(jobUrl.trim(), cvFile)
    clearInterval(intervalRef.current)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleReset = () => { reset(); setJobUrl(''); setCvFile(null); setMsgIdx(0); setViewingAnalysis(null) }

  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status
  const canAnalyze = isValidUrl(jobUrl) && cvFile !== null

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f' }}>
      <header style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 480, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: '#c8f542' }}>Score</span>
          </h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2, letterSpacing: '0.04em' }}>KNOW BEFORE YOU APPLY</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {displayStatus === 'done' && (
            <button onClick={handleReset} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 14px', color: '#888', fontSize: 13, cursor: 'pointer' }}>New</button>
          )}
          {user && (
            <button onClick={onViewDashboard} style={{ background: 'rgba(200,245,66,0.1)', border: '1px solid rgba(200,245,66,0.2)', borderRadius: 20, padding: '7px 14px', color: '#c8f542', fontSize: 13, cursor: 'pointer' }}>History</button>
          )}
        </div>
      </header>

      <main style={{ padding: '24px 20px 40px', maxWidth: 480, margin: '0 auto' }}>

        {displayStatus !== 'done' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            {status === 'idle' && (
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.7 }}>
                {user ? `Welcome back! ` : ''}Paste a job URL and upload your CV — instant ATS score and recommendations.
              </p>
            )}

            {/* Job URL */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Job offer URL</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#555' }}>🔗</span>
                <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://linkedin.com/jobs/view/... or any job board"
                  disabled={status === 'loading'}
                  style={{ width: '100%', background: '#1f1f1f', border: `1px solid ${isValidUrl(jobUrl) ? 'rgba(200,245,66,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: '#f0f0f0', fontSize: 14, padding: '13px 14px 13px 38px', outline: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'border-color 0.2s', WebkitAppearance: 'none' }}
                />
              </div>
              {jobUrl && !isValidUrl(jobUrl) && <p style={{ fontSize: 12, color: '#ff7070', marginTop: 6 }}>Please enter a valid URL including https://</p>}
              <p style={{ fontSize: 11, color: '#444', marginTop: 6 }}>Works with LinkedIn, Indeed, WTTJ, Glassdoor, and most job boards.</p>
            </div>

            {/* CV Upload */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Your CV</label>
              {!cvFile ? (
                <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragging ? 'rgba(200,245,66,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(200,245,66,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
                  <p style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>Drop your CV here or tap to browse</p>
                  <p style={{ fontSize: 12, color: '#444' }}>PDF or Word (.docx) · Max 10MB</p>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div style={{ background: 'rgba(200,245,66,0.06)', border: '1px solid rgba(200,245,66,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{cvFile.type === 'application/pdf' ? '📄' : '📝'}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#c8f542' }}>{cvFile.name}</p>
                      <p style={{ fontSize: 11, color: '#666' }}>{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setCvFile(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>×</button>
                </div>
              )}
            </div>

            {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
                <div style={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #c8f542', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 14, color: '#666' }}>{LOADING_MSGS[msgIdx]}</p>
              </div>
            )}

            {status === 'error' && (
              <div style={{ background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#ff7070', lineHeight: 1.5 }}>⚠ {error}</p>
                <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Some job boards block automated access. Try copying the full job description text instead.</p>
              </div>
            )}

            {status !== 'loading' && (
              <button onClick={handleAnalyze} disabled={!canAnalyze} style={{ width: '100%', padding: '16px', borderRadius: 14, background: canAnalyze ? '#c8f542' : 'rgba(255,255,255,0.06)', color: canAnalyze ? '#0f0f0f' : '#444', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: canAnalyze ? 'pointer' : 'not-allowed', letterSpacing: '-0.01em', transition: 'all 0.2s' }}>
                Analyze my CV →
              </button>
            )}

            {!user && (
              <p style={{ fontSize: 12, color: '#444', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                <span style={{ color: '#c8f542' }}>Sign up free</span> to save your analyses and track progress over time.
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {displayStatus === 'done' && displayData && (
          <div ref={resultRef} style={{ animation: 'fadeUp 0.5s ease' }}>
            <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '28px 20px', marginBottom: 14, textAlign: 'center' }}>
              <ScoreRing score={displayData.score} />
              {displayData.verdict && <p style={{ fontSize: 14, color: '#888', marginTop: 14, lineHeight: 1.5, maxWidth: 280, margin: '14px auto 0' }}>{displayData.verdict}</p>}
            </div>

            {displayData.score < 80 ? (
              <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>⚡</span>
                <p style={{ fontSize: 13, color: '#f5a623', lineHeight: 1.5 }}>You need <strong>80%+</strong> to pass most ATS filters. Follow the recommendations below.</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>✓</span>
                <p style={{ fontSize: 13, color: '#4caf7d', lineHeight: 1.5 }}>Strong match — you're ready to apply!</p>
              </div>
            )}

            <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Score breakdown</p>
              <CategoryBars categories={displayData.categories} />
            </div>

            <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Keywords</p>
              <KeywordTags found={displayData.found_keywords} missing={displayData.missing_keywords} />
            </div>

            <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Recommendations</p>
              <AdviceList advice={displayData.advice} />
            </div>

            {user && (
              <div style={{ background: 'rgba(200,245,66,0.06)', border: '1px solid rgba(200,245,66,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>💾</span>
                <p style={{ fontSize: 13, color: '#888' }}>Analysis saved to your history.</p>
              </div>
            )}

            <button onClick={handleReset} style={{ width: '100%', padding: '15px', borderRadius: 14, background: '#c8f542', color: '#0f0f0f', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}>
              Analyze another job →
            </button>
          </div>
        )}

        {/* Footer links */}
        <div style={{ marginTop: 32, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 20 }}>
          <a href="/privacy" style={{ fontSize: 11, color: '#444', textDecoration: 'none' }}>Privacy & RGPD</a>
          {user && <button onClick={signOut} style={{ fontSize: 11, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign out</button>}
          {!user && <a href="#" onClick={e => { e.preventDefault(); onBack() }} style={{ fontSize: 11, color: '#c8f542', textDecoration: 'none' }}>Sign in / Sign up</a>}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('analyzer') // 'analyzer' | 'dashboard' | 'privacy'
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #c8f542', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  // Handle /privacy route
  if (window.location.pathname === '/privacy') {
    return <PrivacyPage onBack={() => window.history.back()} />
  }

  if (page === 'auth' && !user) return <AuthPage />

  if (page === 'dashboard' && user) {
    return (
      <Dashboard
        onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }}
        onSelectAnalysis={(a) => { setSelectedAnalysis(a); setPage('analyzer') }}
      />
    )
  }

  return (
    <AnalyzerPage
      onBack={() => setPage('auth')}
      onViewDashboard={() => setPage('dashboard')}
      prefillAnalysis={selectedAnalysis}
    />
  )
}
