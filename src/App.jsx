import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { useLang } from './context/LangContext'
import { useAnalyze } from './hooks/useAnalyze'
import { useCvPersist } from './hooks/useCvPersist'
import { useJobUrlHistory } from './hooks/useJobUrlHistory'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import PrivacyPage from './pages/PrivacyPage'
import ResultsView from './components/ResultsView'
import Onboarding from './components/Onboarding'
import Confetti from './components/Confetti'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import ThemeToggle from './components/ThemeToggle'
import LangSelector from './components/LangSelector'

const ACCEPTED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']

function ChipBtn({ onClick, children, accent }) {
  return (
    <button onClick={onClick} style={{
      background: accent ? 'var(--accent-bg)' : 'var(--bg-input)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 20, padding: '7px 16px',
      color: accent ? 'var(--accent)' : 'var(--text-secondary)',
      fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
    }}>{children}</button>
  )
}

function AnalyzerPage({ onViewDashboard, prefillAnalysis, onClearPrefill }) {
  const { t } = useLang()
  const [jobUrl, setJobUrl] = useState('')
  const [dragging, setDragging] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const fileInputRef = useRef(null)
  const { user, signOut } = useAuth()
  const { status, data, error, analyze, reset } = useAnalyze()
  const { cvFile, loading: cvLoading, saveCv, clearCv } = useCvPersist()
  const { history: urlHistory } = useJobUrlHistory()
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)
  const [showConfetti, setShowConfetti] = useState(false)

  const LOADING_MSGS = [t('loading_fetch'), t('loading_cv'), t('loading_ats'), t('loading_score')]
  const isValidUrl = (str) => { try { new URL(str); return true } catch { return false } }

  const handleFile = (file) => {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) { alert(t('drop_cv')); return }
    if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return }
    saveCv(file)
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

  useEffect(() => {
    if (data?.display_score >= 80) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [data])

  const handleReset = () => { reset(); setJobUrl(''); setMsgIdx(0); setViewingAnalysis(null); onClearPrefill?.() }

  const canAnalyze = isValidUrl(jobUrl) && cvFile !== null
  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div className="page page-enter">
      <Confetti active={showConfetti} />

      <header className="page-header">
        <div>
          <div className="logo">Fit<span className="acc">Score</span></div>
          <div className="tagline">{t('tagline')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <LangSelector />
          <ThemeToggle />
          {displayStatus === 'done' && <ChipBtn onClick={handleReset}>{t('new')}</ChipBtn>}
          <ChipBtn onClick={onViewDashboard} accent>{t('history')}</ChipBtn>
        </div>
      </header>

      <main className="page-main">
        {displayStatus !== 'done' && (
          <div style={{ maxWidth: 560, animation: 'fadeUp 0.4s ease' }}>
            {status === 'idle' && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
                {t('welcome_back')}{user?.email ? `, ${user.email.split('@')[0]}` : ''}! {cvFile ? t('welcome_cv_ready') : t('welcome_no_cv')}
              </p>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('job_url_label')}</label>
                {urlHistory.length > 0 && (
                  <button onClick={() => setShowHistory(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                    {showHistory ? t('hide_recent') : t('recent_jobs')}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>🔗</span>
                <input type="url" value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                  placeholder={t('job_url_placeholder')} disabled={status === 'loading'}
                  style={{ paddingLeft: 40, borderColor: isValidUrl(jobUrl) ? 'var(--accent)' : undefined }}
                />
              </div>

              {showHistory && urlHistory.length > 0 && (
                <div style={{ marginTop: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {urlHistory.map((h, i) => {
                    const color = h.score >= 70 ? '#4caf7d' : h.score >= 50 ? '#f5a623' : '#ff6b6b'
                    return (
                      <button key={i} onClick={() => { setJobUrl(h.job_url); setShowHistory(false) }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', minWidth: 32 }}>{h.score}%</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                            {h.result?.job_context?.title || h.job_title || 'Job'}
                          </p>
                          {h.result?.job_context?.company && h.result.job_context.company !== 'Not specified' && (
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@ {h.result.job_context.company}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {jobUrl && !isValidUrl(jobUrl) && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 5 }}>{t('job_url_invalid')}</p>}
              <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 5 }}>{t('job_url_hint')}</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('your_cv')}</label>
                {cvFile && (
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                    {t('change_cv')}
                  </button>
                )}
              </div>

              {cvLoading ? (
                <div className="skeleton" style={{ height: 70 }} />
              ) : !cvFile ? (
                <div onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 14, padding: 'clamp(24px,5vw,40px) 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--accent-bg)' : 'var(--bg-input)', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📎</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('drop_cv')}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('cv_format')}</p>
                  <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8 }}>{t('cv_saved')}</p>
                </div>
              ) : (
                <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{cvFile.type === 'application/pdf' ? '📄' : '📝'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cvFile.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(cvFile.size / 1024).toFixed(0)} KB · {t('saved_on_device')}</p>
                    </div>
                  </div>
                  <button onClick={clearCv} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>×</button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>

            {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                <div style={{ width: 36, height: 36, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', animation: 'pulse 1.8s ease infinite' }}>{LOADING_MSGS[msgIdx]}</p>
              </div>
            )}

            {status === 'error' && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 12, padding: '13px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: '#ff6b6b', lineHeight: 1.5 }}>⚠ {error}</p>
              </div>
            )}

            {status !== 'loading' && (
              <button onClick={handleAnalyze} disabled={!canAnalyze} className="btn-primary" style={{ width: '100%' }}>
                {t('run_ats')}
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
          <a href="/privacy" style={{ fontSize: 11, color: 'var(--text-hint)', textDecoration: 'none' }}>{t('privacy')}</a>
          <button onClick={signOut} style={{ fontSize: 11, color: 'var(--text-hint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('sign_out')}</button>
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

  useEffect(() => {
    if (user && !localStorage.getItem('fitscore_onboarded')) setShowOnboarding(true)
  }, [user])

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  if (window.location.pathname === '/privacy') return <PrivacyPage onBack={() => window.history.back()} />
  if (!user) return <AuthPage />

  return (
    <>
      {showOnboarding && <Onboarding onDone={() => { localStorage.setItem('fitscore_onboarded', 'true'); setShowOnboarding(false) }} />}
      {page === 'dashboard' ? (
        <Dashboard onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }} onSelectAnalysis={(a) => { setSelectedAnalysis(a); setPage('analyzer') }} />
      ) : (
        <AnalyzerPage onViewDashboard={() => setPage('dashboard')} prefillAnalysis={selectedAnalysis} onClearPrefill={() => setSelectedAnalysis(null)} />
      )}
    </>
  )
}
