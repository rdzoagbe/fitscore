import React, { useEffect, useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import UserMenu from './UserMenu'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', labelKey: 'dashboard', fallback: 'Dashboard', short: 'Home' },
  { id: 'analyzer', labelKey: 'analyze', fallback: 'ATS Scanner', short: 'Check' },
  { id: 'history', labelKey: 'history', fallback: 'Job Tracker', short: 'Apps' },
  { id: 'coach', labelKey: 'nav_coach', fallback: 'CV Enhancer', short: 'CV' },
  { id: 'linkedin', labelKey: null, fallback: 'LinkedIn Optimizer', short: 'LinkedIn' }
]

const pageTitles = {
  analyzer: { title: 'ATS Scanner', subtitle: 'Scan a role against your active CV' },
  history: { title: 'Job Tracker', subtitle: 'Review saved analyses and application history' },
  coach: { title: 'CV Enhancer', subtitle: 'Improve achievements, keywords and interview readiness' },
  linkedin: { title: 'LinkedIn Optimizer', subtitle: 'Paste-only profile improvement workspace' },
  admin: { title: 'Admin Analytics', subtitle: 'Product usage and soft-launch signals' },
  'admin-reliability': { title: 'Reliability', subtitle: 'Errors, stability and production health' }
}

function getLabel(t, item) {
  return item.labelKey ? (t(item.labelKey) || item.fallback) : item.fallback
}

function getPageTitle(page) {
  return pageTitles[page] || { title: 'Joblytics', subtitle: 'Application workspace' }
}

function AdminMobileButton({ page, goTo }) {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    if (!user) {
      setIsAdmin(false)
      return () => { active = false }
    }

    supabase.rpc('admin_is_current_user')
      .then(({ data }) => { if (active) setIsAdmin(Boolean(data)) })
      .catch(() => { if (active) setIsAdmin(false) })

    return () => { active = false }
  }, [user?.id])

  if (!isAdmin) return null

  return (
    <button className={`jobNav-mobileItem ${page === 'admin' ? 'is-active' : ''}`} type="button" onClick={() => goTo('admin')}>
      <span>Admin</span>
      <em>Admin</em>
    </button>
  )
}

function MobilePlanSheet({ onClose }) {
  const { t } = useLang()
  const path = window.location.pathname
  const planLabel = t('plan') || 'Plan'
  const usageLimitsLabel = t('usage_limits') || 'Usage limits'

  return (
    <>
      <div className="jobNav-mobileOverlay" onClick={onClose} />
      <section className="jobNav-planSheet" aria-label={planLabel}>
        <div className="jobNav-sheetHandle" />
        <p>Billing</p>
        <h3>Plan and usage</h3>
        <a href="/pricing" className={path === '/pricing' ? 'is-active' : ''}>
          <span>01</span>
          <div><strong>{t('pricing') || 'Pricing'}</strong><small>Plans, prices, and future paid options</small></div>
          <em>View</em>
        </a>
        <a href="/limits" className={path === '/limits' ? 'is-active' : ''}>
          <span>02</span>
          <div><strong>{usageLimitsLabel}</strong><small>ATS checks, cover letters, and CV quotas</small></div>
          <em>View</em>
        </a>
        <button type="button" onClick={onClose}>Close</button>
      </section>
    </>
  )
}

export default function AppNav({ page, setPage, onLogoClick }) {
  const { t } = useLang()
  const [mobilePlanOpen, setMobilePlanOpen] = useState(false)
  const planLabel = t('plan') || 'Plan'
  const planActive = window.location.pathname === '/pricing' || window.location.pathname === '/limits'
  const pageMeta = getPageTitle(page)

  const goTo = id => {
    if (id === 'dashboard') {
      onLogoClick?.()
      setPage('dashboard')
      return
    }
    setPage(id)
  }

  if (page === 'dashboard') return null

  return (
    <>
      <header className="jobNav jobNav--pageHeader">
        <button type="button" className="jobNav-brand" onClick={() => goTo('dashboard')} aria-label={t('go_to_dashboard') || 'Go to dashboard'}>
          <span className="jobNav-brandMark">J</span>
          <span className="jobNav-brandText"><strong>Joblytics</strong><small>Back to dashboard</small></span>
        </button>

        <div className="jobNav-pageTitle" aria-live="polite">
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.subtitle}</p>
        </div>

        <div className="jobNav-right">
          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>New analysis</button>
          <a className="jobNav-textLink" href="/pricing">Plan</a>
          <div className="jobNav-menuWrap"><span>Account</span><UserMenu onViewDashboard={() => goTo('history')} /></div>
        </div>
      </header>

      <nav className="jobNav-mobile" aria-label={t('mobile_navigation') || 'Mobile navigation'}>
        {navItems.map(item => (
          <button key={item.id} type="button" className={`jobNav-mobileItem ${page === item.id ? 'is-active' : ''}`} onClick={() => goTo(item.id)}>
            <span>{item.short}</span><em>{getLabel(t, item)}</em>
          </button>
        ))}
        <AdminMobileButton page={page} goTo={goTo} />
        <button className={`jobNav-mobileItem ${planActive ? 'is-active' : ''}`} type="button" onClick={() => setMobilePlanOpen(true)}>
          <span>Plan</span><em>{planLabel}</em>
        </button>
      </nav>

      {mobilePlanOpen && <MobilePlanSheet onClose={() => setMobilePlanOpen(false)} />}
    </>
  )
}
