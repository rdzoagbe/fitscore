import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { hasAcceptedCurrentTerms } from './lib/legal'
import { supabase } from './lib/supabase'
import LandingPage from './pages/LandingPage'
import Onboarding from './components/Onboarding'
import EmailVerifyGate from './components/EmailVerifyGate'
import TermsGate from './components/TermsGate'
import AppNav from './components/AppNav'
import AppShellBar from './components/AppShellBar'
import './ui-polish.css'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const CareerDashboardPage = lazy(() => import('./pages/CareerDashboardPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const LegalNoticePage = lazy(() => import('./pages/LegalNoticePage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const CvCoachPage = lazy(() => import('./pages/CvCoachPage'))
const CvBuilderPage = lazy(() => import('./pages/CvBuilderPage'))
const ProfileOptimizerPage = lazy(() => import('./pages/ProfileOptimizerPage'))
const BillingPage = lazy(() => import('./pages/BillingPage'))
const AnalyzerPage = lazy(() => import('./pages/AnalyzerPage'))

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
const PUBLIC_PATHS = new Set(['/privacy', '/terms', '/legal', '/auth/callback'])

function getPageFromPath() {
  const path = window.location.pathname || '/'
  if (PATH_TO_PAGE[path]) return PATH_TO_PAGE[path]
  if (path === '/') return 'dashboard'
  return null
}

function AppLoading() {
  return <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>
}

function OAuthCallback() {
  useEffect(() => {
    let cancelled = false

    const completeOAuth = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        } else {
          await supabase.auth.getSession()
        }
      } catch (error) {
        console.error('OAuth callback failed:', error)
      }

      if (!cancelled) {
        window.history.replaceState({ page: 'dashboard' }, '', '/dashboard')
        window.location.reload()
      }
    }

    completeOAuth()

    return () => {
      cancelled = true
    }
  }, [])

  return <AppLoading />
}

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPageState] = useState(() => getPageFromPath() || 'dashboard')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const setPage = nextPage => {
    setPageState(nextPage)
    const nextPath = PAGE_TO_PATH[nextPage]
    if (nextPath && window.location.pathname !== nextPath) window.history.pushState({ page: nextPage }, '', nextPath)
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

  const path = window.location.pathname
  if (path === '/auth/callback') return <OAuthCallback />

  if (loading) return <AppLoading />
  if (path === '/privacy') return <Suspense fallback={<AppLoading />}><PrivacyPage onBack={() => window.history.back()} /></Suspense>
  if (path === '/terms') return <Suspense fallback={<AppLoading />}><TermsPage onBack={() => window.history.back()} /></Suspense>
  if (path === '/legal') return <Suspense fallback={<AppLoading />}><LegalNoticePage onBack={() => window.history.back()} /></Suspense>

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

  return <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text-primary)' }}>{showOnboarding && <Onboarding onDone={() => { localStorage.setItem('fitscore_onboarded','true'); setShowOnboarding(false) }} />}<AppNav page={page} setPage={setPage} onLogoClick={() => { setSelectedAnalysis(null); setPage('dashboard') }} /><main className="appShellContent"><Suspense fallback={<AppLoading />}>{renderPage()}</Suspense></main><AppShellBar /></div>
}