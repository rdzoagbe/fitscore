import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useLang } from './context/LangContext'
import { useAnalyze } from './hooks/useAnalyze'
import { useCvPersist } from './hooks/useCvPersist'
import { useJobUrlHistory } from './hooks/useJobUrlHistory'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CareerDashboardPage from './pages/CareerDashboardPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import CvCoachPage from './pages/CvCoachPage'
import CvBuilderPage from './pages/CvBuilderPage'
import ResultsView from './components/ResultsView'
import Onboarding from './components/Onboarding'
import Confetti from './components/Confetti'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import EmailVerifyGate from './components/EmailVerifyGate'
import AppNav from './components/AppNav'
import AppShellBar from './components/AppShellBar'
import CvPanel from './components/CvPanel'
import TipCard from './components/TipCard'
import './pages/AnalyzerPage.css'
import './pages/CvBuilderPage.css'

const LOADING_MSGS_KEY = ['loading_fetch','loading_cv','loading_ats','loading_score']
const MIN_JOB_TEXT_LENGTH = 60

function AnalyzerPage({ setPage, prefillAnalysis, onClearPrefill }) {
  const { t } = useLang()
  const [jobUrl, setJobUrl] = useState('')
  const [jobText, setJobText] = useState('')
  const [showTextPaste, setShowTextPaste] = useState(false)
  const [userToggledMode, setUserToggledMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [uploadTrigger, setUploadTrigger] = useState(0)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const { status, data, error, savedRow, rateLimit, analyze, reset } = useAnalyze()
  const { cvFile } = useCvPersist()
  const { history: urlHistory } = useJobUrlHistory()
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)
  const [showConfetti, setShowConfetti] = useState(false)

  const LOADING_MSGS = LOADING_MSGS_KEY.map(k => t(k))
  const normalizeJobUrl = value => {
    const withoutHiddenChars = String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '')
    const trimmed = withoutHiddenChars.trim()
    if (!trimmed) return ''

    const compactUrl = trimmed.replace(/\s+/g, '')
    const candidate = /^(https?:\/\/|www\.)/i.test(trimmed) ? compactUrl : trimmed

    if (/^https?:\/\//i.test(candidate)) return candidate
    if (/^www\./i.test(candidate)) return `https://${candidate}`
    if (candidate.includes('.') && !candidate.includes(' ')) return `https://${candidate}`
    return trimmed
  }
  const isValidUrl = str => {
    try {
      const u = new URL(normalizeJobUrl(str))
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }
  const isLikelyJobDescription = value => {
    const text = String(value || '').trim()
    if (text.length < MIN_JOB_TEXT_LENGTH) return false
    if (isValidUrl(text)) return false
    return /\s/.test(text)
  }
  const detectBlockedJobBoard = url => {
    if (!isValidUrl(url)) return null
    const lower = normalizeJobUrl(url).toLowerCase()
    if (lower.includes('linkedin.com')) return 'LinkedIn'
    if (lower.includes('indeed.')) return 'Indeed'
    if (lower.includes('glassdoor.')) return 'Glassdoor'
    if (lower.includes('welcometothejungle.com')) return 'Welcome to the Jungle'
    if (lower.includes('builtin.com') || lower.includes('built-in.com')) return 'Built In'
    return null
  }
  const normalizedJobUrl = normalizeJobUrl(jobUrl)
  const blockedJobBoard = detectBlockedJobBoard(jobUrl)
  const canAnalyzeUrl = isValidUrl(jobUrl)
  const canAnalyzePaste = jobText.trim().length >= MIN_JOB_TEXT_LENGTH
  const canAnalyze = status !== 'loading' && !!cvFile && (canAnalyzePaste || canAnalyzeUrl)
  const pasteProgress = Math.min(100, Math.round((jobText.trim().length / MIN_JOB_TEXT_LENGTH) * 100))

  const switchToPasteMode = () => {
    setShowTextPaste(true)
    setUserToggledMode(true)
    setJobText('')
  }

  const handleUrlChange = e => {
    const value = e.target.value
    if (isLikelyJobDescription(value)) {
      setJobText(value)
      setJobUrl('')
      setShowTextPaste(true)
      setUserToggledMode(false)
      return
    }
    setJobUrl(value)
  }

  const handlePasteTextChange = e => {
    const value = e.target.value
    if (isValidUrl(value)) {
      setJobUrl(normalizeJobUrl(value))
      setJobText('')
      setShowTextPaste(false)
      setUserToggledMode(false)
      return
    }
    setJobText(value)
  }

  const handleAnalyze = async () => {
    if (!cvFile) return
    if (blockedJobBoard && !canAnalyzePaste) {
      setShowTextPaste(true)
      setUserToggledMode(true)
      return
    }
    setViewingAnalysis(null)
    intervalRef.current = setInterval(() => setMsgIdx(i => (i+1) % LOADING_MSGS.length), 1800)
    if (canAnalyzePaste) {
      await analyze(null, cvFile, jobText.trim())
    } else if (canAnalyzeUrl) {
      await analyze(normalizedJobUrl, cvFile)
    }
    clearInterval(intervalRef.current)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const autoSwitchedForErrorRef = useRef(null)
  useEffect(() => {
    if (status !== 'error' || !error) {
      autoSwitchedForErrorRef.current = null
      return
    }
    if (userToggledMode) return
    if (autoSwitchedForErrorRef.current === error) return
    const lower = error.toLowerCase()
    const isBlocked = lower.includes('blocked') || lower.includes('blocking') || lower.includes('paste') || lower.includes('authwall')
    if (isBlocked && !showTextPaste) {
      autoSwitchedForErrorRef.current = error
      setShowTextPaste(true)
    }
  }, [status, error, showTextPaste, userToggledMode])

  const handleReset = useCallback(() => {
    reset()
    setViewingAnalysis(null)
    setJobUrl('')
    setJobText('')
    setShowTextPaste(false)
    setUserToggledMode(false)
    setMsgIdx(0)
    onClearPrefill?.()
  }, [reset, onClearPrefill])

  useEffect(() => {
    if (prefillAnalysis) {
      setViewingAnalysis(prefillAnalysis)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [prefillAnalysis])

  useEffect(() => {
    if (status === 'done' && data?.display_score >= 70) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2600)
    }
  }, [status, data])

  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div className="analyzePro-page">
      {showConfetti && <Confetti />}
      <main className="analyzePro-shell">
        {displayStatus !== 'done' && (
          <div className="analyzePro-layout">
            <section className="analyzePro-card">
              <div className="analyzePro-formHero">
                <p>ATS analysis</p>
                <h1>Check your CV against this job.</h1>
                <p>Paste a job description or add a job link, select your CV, and generate a practical application report.</p>
              </div>

              <CvPanel uploadTrigger={uploadTrigger} />

              <div className="card" style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <button type="button" className="btn-primary" onClick={() => { setShowTextPaste(false); setUserToggledMode(true) }} style={{ opacity: !showTextPaste ? 1 : 0.72 }}>
                    URL mode
                  </button>
                  <button type="button" onClick={() => { setShowTextPaste(true); setUserToggledMode(true) }} style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: showTextPaste ? 'var(--accent-bg)' : 'var(--bg-input)', color: showTextPaste ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer' }}>
                    Paste mode
                  </button>
                </div>

                {!showTextPaste ? (
                  <>
                    <input type="text" inputMode="url" value={jobUrl} onChange={handleUrlChange} onBlur={() => setJobUrl(value => normalizeJobUrl(value))} placeholder="Paste a job link, or paste the full job description here" />
                    {jobUrl.trim() && !isValidUrl(jobUrl) && <TipCard type="warning" title="Link not recognized yet" body="Paste a job URL, or paste the full job description and Joblytics will switch to Paste mode automatically." />}
                    {blockedJobBoard && (
                      <>
                        <TipCard type="warning" title={`${blockedJobBoard} blocks automated reading`} body="Click Analyze Match to switch to Paste mode, then paste the job description text for an accurate analysis." />
                        <button type="button" onClick={switchToPasteMode} style={{ width: '100%', marginTop: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 900, cursor: 'pointer' }}>
                          Switch to Paste mode
                        </button>
                      </>
                    )}
                    {urlHistory.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" onClick={() => setShowHistory(v => !v)} style={{ background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>Recent job links</button>
                        {showHistory && <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>{urlHistory.slice(0,5).map(url => <button key={url} type="button" onClick={() => { setJobUrl(normalizeJobUrl(url)); setJobText(''); setShowTextPaste(false); setShowHistory(false) }} style={{ textAlign: 'left', padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</button>)}</div>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <textarea value={jobText} onChange={handlePasteTextChange} placeholder="Paste the full job description here. If you paste a URL instead, Joblytics will switch back to URL mode." rows={10} />
                    {jobText.trim().length > 0 && !canAnalyzePaste && (
                      <TipCard type="warning" title="Add a little more job text" body={`Paste at least ${MIN_JOB_TEXT_LENGTH} characters from the job offer. Current progress: ${pasteProgress}%.`} />
                    )}
                  </>
                )}

                {status === 'error' && <TipCard type="error" title="Analysis failed" body={error} />}
                {status === 'loading' && <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>{LOADING_MSGS[msgIdx]}</p>}

                <button className="btn-primary" onClick={handleAnalyze} disabled={!canAnalyze} style={{ width: '100%', marginTop: 14 }}>
                  {status === 'loading' ? 'Analyzing...' : 'Analyze match'}
                </button>
              </div>
            </section>

            <aside className="analyzePro-side">
              <div className="analyzePro-sideCard">
                <p className="analyzePro-kicker">Workflow</p>
                <h3>Three steps to a sharper application</h3>
                <div className="analyzePro-steps">
                  <div className="analyzePro-step"><span>1</span><div><strong>Add your CV</strong><small>Upload or reuse the current CV.</small></div></div>
                  <div className="analyzePro-step"><span>2</span><div><strong>Add the job</strong><small>Paste the description for reliable extraction.</small></div></div>
                  <div className="analyzePro-step"><span>3</span><div><strong>Review the report</strong><small>Use gaps, keywords and next steps before applying.</small></div></div>
                </div>
              </div>

              <div className="analyzePro-sideCard">
                <p className="analyzePro-kicker">Pro tip</p>
                <h3>Paste mode is more reliable</h3>
                <p>LinkedIn, Indeed, Welcome to the Jungle, Built In and some job boards block automated reading. For best results, paste the job description text directly.</p>
              </div>
            </aside>
          </div>
        )}

        {displayStatus === 'done' && displayData && (
          <div ref={resultRef} className="page-enter">
            <ResultsView data={displayData} savedRow={viewingAnalysis ? viewingAnalysis : savedRow} rateLimit={rateLimit} onReset={handleReset} onGoCoach={() => setPage('coach')} />
          </div>
        )}
      </main>
      <PWAInstallPrompt />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !localStorage.getItem('fitscore_onboarded')) setShowOnboarding(true)
  }, [user])

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const path = window.location.pathname
  if (path === '/privacy') return <PrivacyPage onBack={() => window.history.back()} />
  if (path === '/terms') return <TermsPage onBack={() => window.history.back()} />
  if (!user) return <LandingPage />
  if (user.email && !user.email_confirmed_at && user.app_metadata?.provider === 'email') return <EmailVerifyGate />

  const renderPage = () => {
    switch(page) {
      case 'dashboard':
        return <CareerDashboardPage setPage={setPage} />
      case 'analyzer':
        return <AnalyzerPage setPage={setPage} prefillAnalysis={selectedAnalysis} onClearPrefill={() => setSelectedAnalysis(null)} />
      case 'history':
        return <Dashboard onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }} onSelectAnalysis={a => { setSelectedAnalysis(a); setPage('analyzer') }} />
      case 'coach':
        return <CvCoachPage />
      case 'cv-builder':
        return <CvBuilderPage selectedAnalysis={selectedAnalysis} />
      default:
        return <CareerDashboardPage setPage={setPage} />
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {showOnboarding && <Onboarding onDone={() => { localStorage.setItem('fitscore_onboarded','true'); setShowOnboarding(false) }} />}
      <AppNav page={page} setPage={setPage} onLogoClick={() => { setSelectedAnalysis(null); setPage('dashboard') }} />
      <main className="appShellContent">
        {renderPage()}
      </main>
      <AppShellBar />
    </div>
  )
}
