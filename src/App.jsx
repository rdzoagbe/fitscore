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

export default function App() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && hasAcceptedCurrentTerms(user) && !localStorage.getItem('fitscore_onboarded')) setShowOnboarding(true)
  }, [user])

  if (loading) return <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 32, height: 32, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>

  const path = window.location.pathname
  if (path === '/privacy') return <PrivacyPage onBack={() => window.history.back()} />
  if (path === '/terms') return <TermsPage onBack={() => window.history.back()} />
  if (path === '/legal') return <LegalNoticePage onBack={() => window.history.back()} />
  if (path === '/contact') return <ContactPage onBack={() => window.history.back()} />
  if (path === '/messages') return user ? <MessagesPage setPage={setPage} /> : <LandingPage />
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
