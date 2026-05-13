import React, { useState, useRef, useEffect } from 'react'
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
import ContactPage from './pages/ContactPage'
import PricingPage from './pages/PricingPage'
import EarlyAccessPage from './pages/EarlyAccessPage'
import LimitsPage from './pages/LimitsPage'
import ResourceHubPage from './pages/ResourceHubPage'
import ResourceArticlePage from './pages/ResourceArticlePage'
import RoleLandingPage from './pages/RoleLandingPage'
import AdminReliabilityPage from './pages/AdminReliabilityPage'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage'
import CvCoachPage from './pages/CvCoachPage'
import LinkedInOptimizerPage from './pages/LinkedInOptimizerPage'
import ResultsView from './components/ResultsView'
import Onboarding from './components/Onboarding'
import Confetti from './components/Confetti'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import EmailVerifyGate from './components/EmailVerifyGate'
import AppNav from './components/AppNav'
import Footer from './components/Footer'
import FeedbackWidget from './components/FeedbackWidget'
import CvPanel from './components/CvPanel'
import ActiveCvVersionSelector from './components/ActiveCvVersionSelector'
import TipCard from './components/TipCard'
import LimitReachedCard from './components/LimitReachedCard'
import { installReliabilityListeners } from './utils/reliabilityClient'
import './pages/AnalyzerPage.css'
import './styles/joblytics-layout-polish.css'
import './styles/joblytics-nav-polish.css'
import './styles/joblytics-typography-polish.css'
import './styles/joblytics-mobile-polish.css'
import './styles/joblytics-cockpit-final.css'
import SampleReportsPage from './pages/SampleReportsPage.jsx'

const LOADING_MSGS_KEY = ['loading_fetch','loading_cv','loading_ats','loading_score']

function routeToPage(pathname) {
  if (pathname === '/analyzer' || pathname === '/ats-scanner') return 'analyzer'
  if (pathname === '/history' || pathname === '/job-tracker' || pathname === '/cover-letters') return 'history'
  if (pathname === '/coach' || pathname === '/cv-enhancer' || pathname === '/interview-prep' || pathname === '/keywords') return 'coach'
  if (pathname === '/linkedin') return 'linkedin'
  if (pathname === '/admin') return 'admin'
  if (pathname === '/admin/reliability') return 'admin-reliability'
  return 'dashboard'
}

function pageToRoute(page) {
  const routes = {
    dashboard: '/dashboard',
    analyzer: '/analyzer',
    history: '/history',
    coach: '/coach',
    linkedin: '/linkedin',
    admin: '/admin',
    'admin-reliability': '/admin/reliability'
  }
  return routes[page] || '/dashboard'
}

function GlobalFooter() {
  return (
    <div style={{ width: 'min(1500px, calc(100% - 56px))', margin: '0 auto', padding: '0 0 96px' }}>
      <Footer compact />
    </div>
  )
}

function PageWithFooter({ children }) {
  return (
    <>
      {children}
      <GlobalFooter />
    </>
  )
}

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
  const { status, data, error, errorDetails, savedRow, rateLimit, analyze, reset } = useAnalyze()
  const { cvFile } = useCvPersist()
  const [activeCvVersion, setActiveCvVersion] = useState(null)
  const [useActiveCvVersion, setUseActiveCvVersion] = useState(false)
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
    const cvVersionPayload = useActiveCvVersion && activeCvVersion?.cv_text ? {
      cvText: activeCvVersion.cv_text,
      cvFileName: activeCvVersion.label || activeCvVersion.target_role || 'Active CV version',
      cvVersionId: activeCvVersion.id,
      cvVersionLabel: activeCvVersion.label || ''
    } : null

    if (!cvFile && !cvVersionPayload) return
    setViewingAnalysis(null)
    intervalRef.current = setInterval(() => setMsgIdx(i => (i+1) % LOADING_MSGS.length), 1800)
    if (showTextPaste && jobText.trim().length > 100) {
      await analyze(null, cvVersionPayload ? null : cvFile, jobText.trim(), cvVersionPayload)
    } else if (isValidUrl(jobUrl)) {
      await analyze(jobUrl.trim(), cvVersionPayload ? null : cvFile, null, cvVersionPayload)
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
    if (errorDetails?.type === 'limit') return
    if (userToggledMode) return
    if (autoSwitchedForErrorRef.current === error) return
    const lower = error.toLowerCase()
    const isBlocked = lower.includes('blocked') || lower.includes('blocking') || lower.includes('paste') || lower.includes('authwall')
    if (isBlocked && !showTextPaste) {
      autoSwitchedForErrorRef.current = error
      const timer = setTimeout(() => {
        setShowTextPaste(true)
        setTimeout(() => {
          const ta = document.querySelector('textarea[placeholder*="job description" i], textarea[placeholder*="description" i]')
          ta?.focus()
        }, 100)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [status, error, errorDetails, userToggledMode, showTextPaste])

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

  const hasCvSource = cvFile !== null || Boolean(useActiveCvVersion && activeCvVersion?.cv_text && activeCvVersion.cv_text.trim().length > 50)
  const canAnalyze = hasCvSource && (
    (showTextPaste && jobText.trim().length > 100) ||
    (!showTextPaste && isValidUrl(jobUrl))
  )
  const displayData = viewingAnalysis?.result || data
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div className="analyzePro-page">
      <Confetti active={showConfetti} />
      <main className="analyzePro-shell">
        {displayStatus !== 'done' && (
          <div className="analyzePro-layout"><section className="analyzePro-card">
            {status === 'idle' && (
              <div className="analyzePro-formHero"><p>{t('ats_analyzer')}</p><h1>{t('analyze_job_match')}</h1><p>{t('analyze_job_match_desc')}</p></div>
            )}

            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('job_url_label')}</label>
                {urlHistory.length > 0 && !showTextPaste && <button onClick={() => setShowHistory(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 500 }}>{showHistory ? t('hide_recent') : t('recent_jobs')}</button>}
              </div>

              {!showTextPaste && <>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>🔗</span>
                  <input type="url" value={jobUrl} onChange={e => { setJobUrl(e.target.value); if (status === 'error') reset() }} placeholder={t('job_url_placeholder')} disabled={status === 'loading'} style={{ paddingLeft: 40, borderColor: isValidUrl(jobUrl) ? 'var(--accent)' : undefined }} />
                </div>
                {jobUrl && !isValidUrl(jobUrl) && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 5 }}>{t('job_url_invalid')}</p>}
                {riskyDomain ? <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 12, color: '#f5a623', fontWeight: 600, marginBottom: 2 }}>{t(`risky_${riskyDomain}_title`) || `${riskyDomain.charAt(0).toUpperCase() + riskyDomain.slice(1)} often blocks automated reading`}</p><p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{t('risky_hint_desc')}</p><button onClick={() => { setShowTextPaste(true); setUserToggledMode(true) }} style={{ background: 'none', border: 'none', color: '#f5a623', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>{t('switch_to_paste') || 'Switch to paste mode →'}</button></div></div> : <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 5 }}>{t('job_url_hint')}</p>}
                {showHistory && urlHistory.length > 0 && <div style={{ marginTop: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, maxHeight: 200, overflowY: 'auto' }}>{urlHistory.map((h, i) => <button key={i} onClick={() => { setJobUrl(h.job_url); setShowHistory(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 11, fontWeight: 700, color: h.score >= 70 ? '#4caf7d' : h.score >= 50 ? '#f5a623' : '#ff6b6b', minWidth: 32 }}>{h.score}%</span><div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.result?.job_context?.title || h.job_title || t('job') || 'Job'}</p>{h.result?.job_context?.company && h.result.job_context.company !== 'Not specified' && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>@ {h.result.job_context.company}</p>}</div></button>)}</div>}
              </>}

              {showTextPaste && <div style={{ animation: 'fadeUp 0.2s ease' }}><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{t('paste_job_label')}</label><textarea value={jobText} onChange={e => { setJobText(e.target.value); if (status === 'error') reset() }} placeholder={t('paste_job_placeholder')} rows={7} maxLength={8000} disabled={status === 'loading'} style={{ borderColor: jobText.length > 100 ? 'var(--accent)' : undefined }} /><p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4, textAlign: 'right' }}>{jobText.length}/8000</p></div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /><button onClick={() => { setShowTextPaste(s => !s); setUserToggledMode(true); reset() }} style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-bg)', border: '1px solid var(--accent)', cursor: 'pointer', padding: '6px 14px', whiteSpace: 'nowrap', fontWeight: 600, borderRadius: 20, fontFamily: 'inherit' }}>{showTextPaste ? `↑ ${t('use_url')}` : (t('or_paste_text'))}</button><div style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

            <div style={{ marginBottom: 24 }}><label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{t('your_cv')}</label><ActiveCvVersionSelector disabled={status === 'loading'} onVersionChange={(version, enabled) => { setActiveCvVersion(version); setUseActiveCvVersion(enabled) }} /><CvPanel key={uploadTrigger} /></div>

            {status === 'loading' && <div style={{ textAlign: 'center', padding: '16px 0 8px' }}><div style={{ width: 36, height: 36, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} /><p style={{ fontSize: 13, color: 'var(--text-secondary)', animation: 'pulse 1.8s ease infinite' }}>{LOADING_MSGS[msgIdx]}</p></div>}
            {status === 'error' && errorDetails?.type === 'limit' && <LimitReachedCard error={error} details={errorDetails} onTryPaste={() => { setShowTextPaste(true); setUserToggledMode(true) }} />}
            {status === 'error' && !showTextPaste && errorDetails?.type !== 'limit' && <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 12, padding: '13px 16px', marginBottom: 14 }}><p style={{ fontSize: 13, color: '#ff6b6b', lineHeight: 1.5 }}>⚠ {error}</p><button onClick={() => { setShowTextPaste(true); setUserToggledMode(true) }} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 0', display: 'block' }}>{t('try_paste_instead')}</button></div>}
            {status !== 'loading' && <><button onClick={handleAnalyze} disabled={!canAnalyze} className="btn-primary" style={{ width: '100%', marginBottom: 8 }}>{t('run_ats')}</button><p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{t('processing_time')}</p></>}
            {status === 'idle' && <TipCard onGoCoach={() => setPage('coach')} onGoHistory={() => setPage('history')} />}
          </section>
          <aside className="analyzePro-side"><div className="analyzePro-sideCard"><p className="analyzePro-kicker">{t('how_it_works')}</p><h3>{t('three_steps_application')}</h3><div className="analyzePro-steps"><div className="analyzePro-step"><span>1</span><div><strong>{t('add_the_job')}</strong><small>{t('add_the_job_desc')}</small></div></div><div className="analyzePro-step"><span>2</span><div><strong>{t('upload_your_cv')}</strong><small>{t('upload_your_cv_desc')}</small></div></div><div className="analyzePro-step"><span>3</span><div><strong>{t('improve_your_match')}</strong><small>{t('improve_your_match_desc')}</small></div></div></div></div><div className="analyzePro-sideCard"><p className="analyzePro-kicker">{t('pro_tip')}</p><h3>{t('paste_mode_reliable')}</h3><p>{t('paste_mode_reliable_desc')}</p></div></aside>
          </div>
        )}
        {displayStatus === 'done' && displayData && <div ref={resultRef} className="page-enter"><ResultsView data={displayData} savedRow={viewingAnalysis ? viewingAnalysis : savedRow} rateLimit={rateLimit} onReset={handleReset} onGoCoach={() => setPage('coach')} /></div>}
      </main>
      <PWAInstallPrompt />
      <FeedbackWidget />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPageRaw] = useState(() => routeToPage(window.location.pathname))
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const setPage = nextPage => {
    setPageRaw(nextPage)
    const nextRoute = pageToRoute(nextPage)
    if (window.location.pathname !== nextRoute) window.history.pushState({}, '', nextRoute)
  }

  useEffect(() => {
    const syncRoute = () => setPageRaw(routeToPage(window.location.pathname))
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    if (user && !localStorage.getItem('fitscore_onboarded')) setShowOnboarding(true)
  }, [user])

  useEffect(() => installReliabilityListeners(), [])

  if (loading) return <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  const path = window.location.pathname
  if (path === '/privacy') return <PageWithFooter><PrivacyPage onBack={() => window.history.back()} /></PageWithFooter>
  if (path === '/terms') return <PageWithFooter><TermsPage onBack={() => window.history.back()} /></PageWithFooter>
  if (path === '/contact' || path === '/support') return <PageWithFooter><ContactPage onBack={() => window.history.back()} /></PageWithFooter>
  if (path === '/pricing') return <PageWithFooter><PricingPage onBack={() => window.history.back()} /></PageWithFooter>
  if (path === '/early-access' || path === '/waitlist') return <PageWithFooter><EarlyAccessPage /></PageWithFooter>
  if (path === '/limits') return <PageWithFooter><LimitsPage onBack={() => window.history.back()} /></PageWithFooter>
  if (path === '/roles') return <PageWithFooter><RoleLandingPage /></PageWithFooter>
  if (path.startsWith('/roles/')) return <PageWithFooter><RoleLandingPage slug={path.split('/').filter(Boolean)[1]} /></PageWithFooter>
  if (path === '/resources' || path === '/blog') return <PageWithFooter><ResourceHubPage /></PageWithFooter>
  if (path.startsWith('/resources/')) return <PageWithFooter><ResourceArticlePage slug={path.split('/').filter(Boolean)[1]} /></PageWithFooter>
  if (path === '/sample-reports') return <PageWithFooter><SampleReportsPage /></PageWithFooter>
  if (path.startsWith('/sample-reports/')) return <PageWithFooter><SampleReportsPage slug={path.split('/').filter(Boolean)[1]} /></PageWithFooter>

  if (!user) return <LandingPage />
  if (user.email && !user.email_confirmed_at && user.app_metadata?.provider === 'email') return <EmailVerifyGate />

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <CareerDashboardPage setPage={setPage} />
      case 'analyzer': return <AnalyzerPage setPage={setPage} prefillAnalysis={selectedAnalysis} onClearPrefill={() => setSelectedAnalysis(null)} />
      case 'history': return <Dashboard onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }} onSelectAnalysis={a => { setSelectedAnalysis(a); setPage('analyzer') }} />
      case 'coach': return <CvCoachPage />
      case 'admin-reliability': return <AdminReliabilityPage setPage={setPage} />
      case 'admin': return <AdminAnalyticsPage setPage={setPage} />
      case 'linkedin': return <LinkedInOptimizerPage />
      default: return <CareerDashboardPage setPage={setPage} />
    }
  }

  return <>{showOnboarding && <Onboarding onDone={(result) => { localStorage.setItem('fitscore_onboarded','true'); setShowOnboarding(false); if (result?.nextPage) setPage(result.nextPage) }} />}<AppNav page={page} setPage={setPage} onLogoClick={() => { setSelectedAnalysis(null); setPage('dashboard') }} />{renderPage()}<GlobalFooter /></>
}
