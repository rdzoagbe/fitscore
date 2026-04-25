import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useAnalyze } from './hooks/useAnalyze'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PrivacyPage from './pages/PrivacyPage'
import ResultsView from './components/ResultsView'

const LOADING_MSGS = ['Fetching job posting...', 'Reading your CV...', 'Running ATS simulation...', 'Calculating your score...']
const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']

function AnalyzerPage({ onViewDashboard, prefillAnalysis, onClearPrefill }) {
  const [jobUrl, setJobUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [lastCvName, setLastCvName] = useState(() => localStorage.getItem('fitscore_last_cv') || null)
  const [dragging, setDragging] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user, signOut } = useAuth()
  const { status, data, error, analyze, reset } = useAnalyze()
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)

  const isValidUrl = (str) => { try { new URL(str); return true } catch { return false } }

  const handleFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert('Please upload a PDF or Word (.docx) file.'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum 10MB.'); return }
    setCvFile(file)
    localStorage.setItem('fitscore_last_cv', file.name)
    setLastCvName(file.name)
  }

  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }, [])

  const handleAnalyze = async () => {
    if (!jobUrl.trim() || !cvFile) return
    setViewingAnalysis(null)
    intervalRef.current = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 1800)
    await analyze(jobUrl.trim(), cvFile)
    clearInterval(intervalRef.current)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleReset = () => { reset(); setJobUrl(''); setCvFile(null); setMsgIdx(0); setViewingAnalysis(null); onClearPrefill?.() }
  const canAnalyze = isValidUrl(jobUrl) && cvFile !== null
  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f' }}>
      <header style={{ padding: 'clamp(16px,4vw,24px) var(--side-pad) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 'var(--content-width)', margin: '0 auto' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(18px,4vw,22px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: '#c8f542' }}>Score</span>
          </h1>
          <p style={{ fontSize: 10, color: '#555', marginTop: 2, letterSpacing: '0.05em' }}>KNOW BEFORE YOU APPLY</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {displayStatus === 'done' && <button onClick={handleReset} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '7px 14px', color: '#888', fontSize: 12, cursor: 'pointer' }}>New</button>}
          <button onClick={onViewDashboard} style={{ background: 'rgba(200,245,66,0.1)', border: '1px solid rgba(200,245,66,0.2)', borderRadius: 20, padding: '7px 14px', color: '#c8f542', fontSize: 12, cursor: 'pointer' }}>History</button>
        </div>
      </header>

      <main style={{ padding: 'clamp(20px,4vw,32px) var(--side-pad) 60px', maxWidth: 'var(--content-width)', margin: '0 auto' }}>

        {displayStatus !== 'done' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            {status === 'idle' && (
              <p style={{ fontSize: 'clamp(13px,3vw,14px)', color: '#666', marginBottom: 'clamp(20px,5vw,28px)', lineHeight: 1.7 }}>
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Paste a job URL and upload your CV for a real ATS check.
              </p>
            )}

            {/* Job URL */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Job offer URL</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#555' }}>🔗</span>
                <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://linkedin.com/jobs/... or indeed.com/..."
                  disabled={status === 'loading'}
                  style={{ width: '100%', background: '#1f1f1f', border: `1px solid ${isValidUrl(jobUrl) ? 'rgba(200,245,66,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, color: '#f0f0f0', fontSize: 'clamp(13px,3vw,14px)', padding: '13px 14px 13px 40px', outline: 'none', fontFamily: 'DM Sans, sans-serif', transition: 'border-color 0.2s', WebkitAppearance: 'none' }}
                />
              </div>
              {jobUrl && !isValidUrl(jobUrl) && <p style={{ fontSize: 12, color: '#ff7070', marginTop: 5 }}>Please enter a valid URL including https://</p>}
              <p style={{ fontSize: 11, color: '#444', marginTop: 5 }}>Works with Indeed, WTTJ, Glassdoor. LinkedIn may block access — try copying the URL directly.</p>
            </div>

            {/* CV Upload */}
            <div style={{ marginBottom: 'clamp(20px,5vw,28px)' }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Your CV</label>
              {!cvFile ? (
                <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragging ? 'rgba(200,245,66,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: 'clamp(20px,5vw,32px) 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(200,245,66,0.04)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>📎</div>
                  <p style={{ fontSize: 'clamp(13px,3vw,14px)', color: '#888', marginBottom: 4 }}>Drop your CV here or tap to browse</p>
                  <p style={{ fontSize: 11, color: '#444' }}>PDF or Word (.docx) · Max 10MB</p>
                  {lastCvName && <p style={{ fontSize: 11, color: '#555', marginTop: 8 }}>Last used: {lastCvName}</p>}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div style={{ background: 'rgba(200,245,66,0.06)', border: '1px solid rgba(200,245,66,0.2)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{cvFile.type === 'application/pdf' ? '📄' : '📝'}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#c8f542' }}>{cvFile.name}</p>
                      <p style={{ fontSize: 11, color: '#666' }}>{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setCvFile(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>×</button>
                </div>
              )}
            </div>

            {/* Loading */}
            {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
                <div style={{ width: 34, height: 34, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #c8f542', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: '#666', animation: 'pulse 1.8s ease infinite' }}>{LOADING_MSGS[msgIdx]}</p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div style={{ background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 12, padding: '13px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: '#ff7070', lineHeight: 1.5 }}>⚠ {error}</p>
                <p style={{ fontSize: 11, color: '#666', marginTop: 5 }}>Try Indeed or WTTJ — LinkedIn may block automated access.</p>
              </div>
            )}

            {status !== 'loading' && (
              <button onClick={handleAnalyze} disabled={!canAnalyze} style={{ width: '100%', padding: 'clamp(13px,3vw,16px)', borderRadius: 14, background: canAnalyze ? '#c8f542' : 'rgba(255,255,255,0.06)', color: canAnalyze ? '#0f0f0f' : '#444', border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(14px,3.5vw,16px)', fontWeight: 700, cursor: canAnalyze ? 'pointer' : 'not-allowed', letterSpacing: '-0.01em', transition: 'all 0.2s' }}>
                Run ATS check →
              </button>
            )}
          </div>
        )}

        {displayStatus === 'done' && displayData && (
          <div ref={resultRef}><ResultsView data={displayData} onReset={handleReset} /></div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 20 }}>
          <a href="/privacy" style={{ fontSize: 11, color: '#444', textDecoration: 'none' }}>Privacy & RGPD</a>
          <button onClick={signOut} style={{ fontSize: 11, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign out</button>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('analyzer')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #c8f542', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (window.location.pathname === '/privacy') return <PrivacyPage onBack={() => window.history.back()} />
  if (!user) return <AuthPage />
  if (page === 'dashboard') return <Dashboard onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }} onSelectAnalysis={(a) => { setSelectedAnalysis(a); setPage('analyzer') }} />

  return <AnalyzerPage onViewDashboard={() => setPage('dashboard')} prefillAnalysis={selectedAnalysis} onClearPrefill={() => setSelectedAnalysis(null)} />
}
