import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { hasAcceptedCurrentTerms } from './lib/legal'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import CareerDashboardPage from './pages/CareerDashboardPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import LegalNoticePage from './pages/LegalNoticePage'
import ContactPage from './pages/ContactPage'
import MessagesPage from './pages/MessagesPage'
import CvCoachPage from './pages/CvCoachPage'
import CvBuilderPage from './pages/CvBuilderPage'
import ProfileOptimizerPage from './pages/ProfileOptimizerPage'
import BillingPage from './pages/BillingPage'
import AnalyzerPage from './pages/AnalyzerPage'
import Onboarding from './components/Onboarding'
import EmailVerifyGate from './components/EmailVerifyGate'
import TermsGate from './components/TermsGate'
import AppNav from './components/AppNav'
import AppShellBar from './components/AppShellBar'
import './pages/CvBuilderPage.css'

const PAGE_TO_PATH = {
  dashboard: '/dashboard',
  analyzer: '/analyzer',
  history: '/history',
  coach: '/coach',
  profile: '/profile',
  billing: '/billing',
  messages: '/messages',
  contact: '/contact',
  'cv-builder': '/cv-builder'
}

const PATH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page]))
const PUBLIC_PATHS = new Set(['/privacy', '/terms', '/legal'])

function getPageFromPath() {
  const path = window.location.pathname || '/'
  if (PATH_TO_PAGE[path]) return PATH_TO_PAGE[path]
  if (path === '/') return 'dashboard'
  return null
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPageState] = useState(() => getPageFromPath() || 'dashboard')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const setPage = nextPage => {
    setPageState(nextPage)
    const nextPath = PAGE_TO_PATH[nextPage]
    if (nextPath && window.location.pathname !== nextPath) {
      window.history.pushState({ page: nextPage }, '', nextPath)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      const nextPage = getPageFromPath()
      if (nextPage) setPageState(nextPage)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (user && hasAcceptedCurrentTerms(user) && !localStorage.getItem('fitscore_onboarded')) setShowOnboarding(true)
  }, [user])

  if (loading) return <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  const path = window.location.pathname
  if (path === '/privacy') return <PrivacyPage onBack={() => window.history.back()} />
  if (path === '/terms') return <TermsPage onBack={() => window.history.back()} />
  if (path === '/legal') return <LegalNoticePage onBack={() => window.history.back()} />

  const routePage = getPageFromPath()
  if (!routePage && !PUBLIC_PATHS.has(path)) window.history.replaceState({ page: 'dashboard' }, '', '/dashboard')

  if (!user) return <LandingPage />
  if (user.email && !user.email_confirmed_at && user.app_metadata?.provider === 'email') return <EmailVerifyGate />
  if (!hasAcceptedCurrentTerms(user)) return <TermsGate />

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <CareerDashboardPage setPage={setPage} />
      case 'analyzer': return <AnalyzerPage setPage={setPage} prefillAnalysis={selectedAnalysis} onClearPrefill={() => setSelectedAnalysis(null)} />
      case 'history': return <Dashboard onNewAnalysis={() => { setSelectedAnalysis(null); setPage('analyzer') }} onSelectAnalysis={a => { setSelectedAnalysis(a); setPage('analyzer') }} />
      case 'coach': return <CvCoachPage />
      case 'profile': return <ProfileOptimizerPage />
      case 'billing': return <BillingPage />
      case 'messages': return <MessagesPage setPage={setPage} />
      case 'contact': return <ContactPage onBack={() => setPage('dashboard')} />
      case 'cv-builder': return <CvBuilderPage selectedAnalysis={selectedAnalysis} />
      default: return <CareerDashboardPage setPage={setPage} />
    }
  }

  return <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text-primary)' }}>{showOnboarding && <Onboarding onDone={() => { localStorage.setItem('fitscore_onboarded','true'); setShowOnboarding(false) }} />}<AppNav page={page} setPage={setPage} onLogoClick={() => { setSelectedAnalysis(null); setPage('dashboard') }} /><main className="appShellContent">{renderPage()}</main><AppShellBar /></div>
}