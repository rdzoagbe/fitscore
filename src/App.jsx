import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useLang } from './context/LangContext'
import { useAnalyze } from './hooks/useAnalyze'
import { useCvPersist } from './hooks/useCvPersist'
import { useJobUrlHistory } from './hooks/useJobUrlHistory'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import CvCoachPage from './pages/CvCoachPage'
import ResultsView from './components/ResultsView'
import Onboarding from './components/Onboarding'
import Confetti from './components/Confetti'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import EmailVerifyGate from './components/EmailVerifyGate'
import TopNav from './components/TopNav'
import Footer from './components/Footer'
import CvPanel from './components/CvPanel'

const LOADING_MSGS_KEY = ['loading_fetch','loading_cv','loading_ats','loading_score']

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
  const { user } = useAuth()
  const { status, data, error, analyze, reset } = useAnalyze()
  const { cvFile, clearCv } = useCvPersist()
  const { history: urlHistory } = useJobUrlHistory()
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)
  const [showConfetti, setShowConfetti] = useState(false)

  const LOADING_MSGS = LOADING_MSGS_KEY.map(k => t(k))
  const isValidUrl = str => { try { new URL(str); return true } catch { return false } }
  const detectRiskyDomain = url => {
    if (!isValidUrl(url)) return null
    const lower = url.toLowerCase()
    if (lower.includes('linkedin.com')) return 'linkedin'
    if (lower.includes('indeed.')) return 'indeed'
    if (lower.includes('glassdoor.')) return 'glassdoor'
    return null
  }
  const riskyDomain = detectRiskyDomain(jobUrl)

  const handleAnalyze = async () => {
    if (!cvFile) return
    setViewingAnalysis(null)
    intervalRef.current = setInterval(() => setMsgIdx(i => (i+1) % LOADING_MSGS.length), 1800)
    if (showTextPaste && jobText.trim().length > 100) {
      await analyze(null, cvFile, jobText.trim())
    } else if (isValidUrl(jobUrl)) {
      await analyze(jobUrl.trim(), cvFile)
    }
    clearInterval(intervalRef.current)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  // Watch for blocking errors and auto-switch to paste mode (only once per error)
  useEffect(() => {
    if (status !== 'error' || !error) return
    if (userToggledMode) return  // Respect user's manual choice
    const lower = error.toLowerCase()
    const isBlocked = lower.includes('blocked') || lower.includes('blocking') || lower.includes('paste') || lower.includes('authwall')
    if (isBlocked && !showTextPaste) {
      const timer = setTimeout(() => {
        setShowTextPaste(true)
        setTimeout(() => {
          const ta = document.querySelector('textarea[placeholder*="job description" i], textarea[placeholder*="description" i]')
          ta?.focus()
        }, 100)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [status, error])

  useEffect(() => {
    if (data?.display_score >= 80) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [data])

  const handleReset = () => {
    reset(); setJobUrl(''); setJobText(''); setMsgIdx(0)
    setViewingAnalysis(null); onClearPrefill?.()
    setUserToggledMode(false); setShowTextPaste(false)
  }

  const canAnalyze = cvFile !== null && (
    (showTextPaste && jobText.trim().length > 100) ||
    (!showTextPaste && isValidUrl(jobUrl))
  )
  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <Confetti active={showConfetti} />

      <main style={{ padding: 'clamp(20px,4vw,36px) clamp(16px,5vw,48px) 80px', maxWidth: 900, margin: '0 auto' }}>

        {displayStatus !== 'done' && (
          <div style={{ maxWidth: 600, animation: 'fadeUp 0.4s ease' }}>
            {status === 'idle' && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
                {t('welcome_back')}{user?.email ? `, ${user.email.split('@')[0]}` : ''}!{' '}
                {cvFile ? t('welcome_cv_ready') : t('welcome_no_cv')}
              </p>
            )}

            {/* Job URL */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('job_url_label')}</label>
                {urlHistory.length > 0 && !showTextPaste && (
                  <button onClick={() => setShowHistory(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                    {showHistory ? t('hide_recent') : t('recent_jobs')}
                  </button>
                )}
              </div>

              {!showTextPaste && (
                <>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>🔗</span>
                    <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                      placeholder={t('job_url_placeholder')} disabled={status === 'loading'}
                      style={{ paddingLeft: 40, borderColor: isValidUrl(jobUrl) ? 'var(--accent)' : undefined }}
                    />
                  </div>
                  {jobUrl && !isValidUrl(jobUrl) && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 5 }}>{t('job_url_invalid')}</p>}
                  {riskyDomain ? (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, color: '#f5a623', fontWeight: 600, marginBottom: 2 }}>
                          {t(`risky_${riskyDomain}_title`) || `${riskyDomain.charAt(0).toUpperCase() + riskyDomain.slice(1)} often blocks automated reading`}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                          {t('risky_hint_desc') || 'For best results, copy the job description directly from the page and paste it below.'}
                        </p>
                        <button onClick={() => { setShowTextPaste(true); setUserToggledMode(true) }} style={{ background: 'none', border: 'none', color: '#f5a623', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                          {t('switch_to_paste') || 'Switch to paste mode →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 5 }}>{t('job_url_hint')}</p>
                  )}

                  {showHistory && urlHistory.length > 0 && (
                    <div style={{ marginTop: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                      {urlHistory.map((h, i) => {
                        const color = h.score >= 70 ? '#4caf7d' : h.score >= 50 ? '#f5a623' : '#ff6b6b'
                        return (
                          <button key={i} onClick={() => { setJobUrl(h.job_url); setShowHistory(false) }}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32 }}>{h.score}%</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {h.result?.job_context?.title || h.job_title || 'Job'}
                              </p>
                              {h.result?.job_context?.company && h.result.job_context.company !== 'Not specified' && (
                                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>@ {h.result.job_context.company}</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {showTextPaste && (
                <div style={{ animation: 'fadeUp 0.2s ease' }}>
                  {status === 'error' && error && (error.toLowerCase().includes('blocked') || error.toLowerCase().includes('blocking') || error.toLowerCase().includes('paste')) && (
                    <div style={{ marginBottom: 12, padding: '11px 14px', background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: 12, animation: 'fadeUp 0.3s ease' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#4caf7d', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ✨ {t('auto_switched_title') || 'Switched to paste mode for you'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t('auto_switched_desc') || 'Copy the job description text from the page and paste it below — we\'ll do the rest.'}
                      </p>
                    </div>
                  )}
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    {t('paste_job_label') || 'Job description text'}
                  </label>
                  <textarea value={jobText} onChange={e => { setJobText(e.target.value); if (status === 'error') reset() }}
                    placeholder={t('paste_job_placeholder') || 'Paste the full job description here...'}
                    rows={7} maxLength={8000} disabled={status === 'loading'}
                    style={{ borderColor: jobText.length > 100 ? 'var(--accent)' : undefined }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4, textAlign: 'right' }}>
                    {jobText.length}/8000
                  </p>
                </div>
              )}
            </div>

            {/* OR toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <button onClick={() => { setShowTextPaste(s => !s); setUserToggledMode(true); reset() }} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {showTextPaste ? `↑ ${t('use_url') || 'Use URL instead'}` : (t('or_paste_text') || 'OR paste job description')}
              </button>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* CV Panel */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{t('your_cv')}</label>
              <CvPanel key={uploadTrigger} />
            </div>

            {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <div style={{ width: 36, height: 36, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', animation: 'pulse 1.8s ease infinite' }}>{LOADING_MSGS[msgIdx]}</p>
              </div>
            )}

            {/* Hide red error if we've already switched to paste mode (green banner shows there instead) */}
            {status === 'error' && !showTextPaste && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 12, padding: '13px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: '#ff6b6b', lineHeight: 1.5 }}>⚠ {error}</p>
                <button onClick={() => { setShowTextPaste(true); setUserToggledMode(true) }} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0', display: 'block' }}>
                  {t('try_paste_instead') || '→ Try pasting the job description instead'}
                </button>
              </div>
            )}

            {status !== 'loading' && (
              <>
                <button onClick={handleAnalyze} disabled={!canAnalyze} className="btn-primary" style={{ width: '100%', marginBottom: 8 }}>
                  {t('run_ats')}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {t('processing_time') || 'Processing takes ~15 seconds'}
                </p>
              </>
            )}
          </div>
        )}

        {displayStatus === 'done' && displayData && (
          <div ref={resultRef} className="page-enter">
            <ResultsView
              data={displayData}
              onReset={handleReset}
              onGoCoach={() => setPage('coach')}
            />
          </div>
        )}

        <Footer compact />
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
        return <Dashboard
          onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }}
          onSelectAnalysis={a => { setSelectedAnalysis(a); setPage('analyzer') }}
        />
      case 'coach':
        return <CvCoachPage />
      default:
        return <AnalyzerPage
          setPage={setPage}
          prefillAnalysis={selectedAnalysis}
          onClearPrefill={() => setSelectedAnalysis(null)}
        />
    }
  }

  return (
    <>
      {showOnboarding && <Onboarding onDone={() => { localStorage.setItem('fitscore_onboarded','true'); setShowOnboarding(false) }} />}
      <TopNav page={page} setPage={setPage} />
      {renderPage()}
    </>
  )
}
