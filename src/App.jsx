import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useAnalyze } from './hooks/useAnalyze'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PrivacyPage from './pages/PrivacyPage'
import ResultsView from './components/ResultsView'
import Onboarding from './components/Onboarding'
import Confetti from './components/Confetti'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import ThemeToggle from './components/ThemeToggle'

const LOADING_MSGS = [
  'Fetching job posting...',
  'Reading your CV...',
  'Running ATS simulation...',
  'Calculating your score...'
]
const ACCEPTED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
]

function Logo() {
  return (
    <div>
      <div className="logo">Fit<span className="acc">Score</span></div>
      <div className="tagline">KNOW BEFORE YOU APPLY</div>
    </div>
  )
}

function ChipBtn({ onClick, children, accent, style = {} }) {
  return (
    <button onClick={onClick} style={{
      background: accent ? 'rgba(200,245,66,0.12)' : 'var(--bg-input)',
      border: `1px solid ${accent ? 'rgba(200,245,66,0.3)' : 'var(--border)'}`,
      borderRadius: 20, padding: '7px 16px',
      color: accent ? 'var(--accent)' : 'var(--text-secondary)',
      fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
      transition: 'all 0.2s', ...style
    }}>{children}</button>
  )
}

function AnalyzerPage({ onViewDashboard, prefillAnalysis, onClearPrefill }) {
  const [jobUrl, setJobUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [storedCvName] = useState(() => {
    const user = JSON.parse(localStorage.getItem('fitscore_user') || '{}')
    if (user.id) {
      const cv = localStorage.getItem(`fitscore_cv_${user.id}`)
      if (cv) { try { return JSON.parse(cv).name } catch {} }
    }
    return localStorage.getItem('fitscore_last_cv') || null
  })
  const [dragging, setDragging] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user, signOut } = useAuth()
  const { status, data, error, analyze, reset } = useAnalyze()
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)
  const [showConfetti, setShowConfetti] = useState(false)

  const isValidUrl = (str) => { try { new URL(str); return true } catch { return false } }

  const handleFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert('Please upload a PDF or Word (.docx) file.'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum 10MB.'); return }
    setCvFile(file)
    localStorage.setItem('fitscore_last_cv', file.name)
    if (user?.id) {
      localStorage.setItem(`fitscore_cv_${user.id}`, JSON.stringify({ name: file.name, size: file.size, type: file.type }))
    }
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

  // Show confetti when score >= 80
  useEffect(() => {
    if (data?.display_score >= 80) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [data])

  const handleReset = () => {
    reset(); setJobUrl(''); setCvFile(null); setMsgIdx(0)
    setViewingAnalysis(null); onClearPrefill?.()
  }

  const canAnalyze = isValidUrl(jobUrl) && cvFile !== null
  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div className="page page-enter">
      <Confetti active={showConfetti} />

      <header className="page-header">
        <Logo />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <ThemeToggle />
          {displayStatus === 'done' && <ChipBtn onClick={handleReset}>New</ChipBtn>}
          <ChipBtn onClick={onViewDashboard} accent>History</ChipBtn>
        </div>
      </header>

      <main className="page-main">
        {displayStatus !== 'done' && (
          <div style={{ maxWidth: 560, animation: 'fadeUp 0.4s ease' }}>
            {status === 'idle' && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.7 }}>
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Paste a job URL and upload your CV for a real ATS check.
              </p>
            )}

            {/* Job URL */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Job offer URL</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>🔗</span>
                <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://linkedin.com/jobs/... or indeed.com/..."
                  disabled={status === 'loading'}
                  style={{ paddingLeft: 40, borderColor: isValidUrl(jobUrl) ? 'rgba(200,245,66,0.4)' : undefined }}
                />
              </div>
              {jobUrl && !isValidUrl(jobUrl) && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 5 }}>Please enter a valid URL including https://</p>}
              <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 5 }}>Works with Indeed, WTTJ, Glassdoor. LinkedIn may block access.</p>
            </div>

            {/* CV Upload */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Your CV</label>
              {!cvFile ? (
                <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragging ? 'rgba(200,245,66,0.6)' : 'var(--border)'}`, borderRadius: 14, padding: 'clamp(24px,5vw,40px) 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(200,245,66,0.04)' : 'var(--bg-input)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Drop your CV here or tap to browse</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF or Word (.docx) · Max 10MB</p>
                  {storedCvName && (
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(200,245,66,0.08)', border: '1px solid rgba(200,245,66,0.2)', borderRadius: 20, padding: '4px 12px' }}>
                      <span style={{ fontSize: 11 }}>📄</span>
                      <span style={{ fontSize: 11, color: 'var(--accent)' }}>Last used: {storedCvName}</span>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div style={{ background: 'rgba(200,245,66,0.06)', border: '1px solid rgba(200,245,66,0.25)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{cvFile.type === 'application/pdf' ? '📄' : '📝'}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>{cvFile.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(cvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setCvFile(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>×</button>
                </div>
              )}
            </div>

            {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                <div style={{ width: 36, height: 36, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', animation: 'pulse 1.8s ease infinite' }}>{LOADING_MSGS[msgIdx]}</p>
              </div>
            )}

            {status === 'error' && (
              <div style={{ background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: 12, padding: '13px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: '#ff7070', lineHeight: 1.5 }}>⚠ {error}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Try Indeed or WTTJ — LinkedIn may block automated access.</p>
              </div>
            )}

            {status !== 'loading' && (
              <button onClick={handleAnalyze} disabled={!canAnalyze} className="btn-primary" style={{ width: '100%', opacity: canAnalyze ? 1 : 0.35, cursor: canAnalyze ? 'pointer' : 'not-allowed' }}>
                Run ATS check →
              </button>
            )}
          </div>
        )}

        {displayStatus === 'done' && displayData && (
          <div ref={resultRef} className="page-enter">
            <ResultsView data={displayData} onReset={handleReset} />
          </div>
        )}

        <div style={{ marginTop: 36, display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/privacy" style={{ fontSize: 11, color: 'var(--text-hint)', textDecoration: 'none' }}>Privacy & RGPD</a>
          <button onClick={signOut} style={{ fontSize: 11, color: 'var(--text-hint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign out</button>
        </div>
      </main>

      <PWAInstallPrompt />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('analyzer')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Show onboarding for first-time users
  useEffect(() => {
    if (user && !localStorage.getItem('fitscore_onboarded')) {
      setShowOnboarding(true)
    }
    // Cache user id for CV store
    if (user) localStorage.setItem('fitscore_user', JSON.stringify({ id: user.id }))
  }, [user])

  const handleOnboardingDone = () => {
    localStorage.setItem('fitscore_onboarded', 'true')
    setShowOnboarding(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (window.location.pathname === '/privacy') return <PrivacyPage onBack={() => window.history.back()} />
  if (!user) return <AuthPage />

  return (
    <>
      {showOnboarding && <Onboarding onDone={handleOnboardingDone} />}

      {page === 'dashboard' ? (
        <Dashboard
          onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }}
          onSelectAnalysis={(a) => { setSelectedAnalysis(a); setPage('analyzer') }}
        />
      ) : (
        <AnalyzerPage
          onViewDashboard={() => setPage('dashboard')}
          prefillAnalysis={selectedAnalysis}
          onClearPrefill={() => setSelectedAnalysis(null)}
        />
      )}
    </>
  )
}
