import React, { useEffect, useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import UserMenu from './UserMenu'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', labelKey: 'dashboard', fallback: 'Dashboard', short: 'Home' },
  { id: 'analyzer', labelKey: 'analyze', fallback: 'Analyze', short: 'Check' },
  { id: 'history', labelKey: 'history', fallback: 'Applications', short: 'Apps' },
  { id: 'coach', labelKey: 'nav_coach', fallback: 'CV Coach', short: 'CV' },
  { id: 'linkedin', labelKey: null, fallback: 'LinkedIn', short: 'LinkedIn' }
]

function getLabel(t, item) {
  return item.labelKey ? (t(item.labelKey) || item.fallback) : item.fallback
}

function AdminNavButton({ page, goTo, mobile = false }) {
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

  if (mobile) {
    return (
      <button className={`jobNav-mobileItem ${page === 'admin' ? 'is-active' : ''}`} type="button" onClick={() => goTo('admin')}>
        <span>Admin</span>
        <em>Admin</em>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`jobNav-link ${page === 'admin' ? 'is-active' : ''}`}
      onClick={() => goTo('admin')}
      title="Admin analytics"
    >
      Admin
    </button>
  )
}

function PlanDropdown() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const path = window.location.pathname
  const active = path === '/pricing' || path === '/limits'
  const planLabel = t('plan') || 'Plan'
  const usageLimitsLabel = t('usage_limits') || 'Usage limits'

  useEffect(() => {
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="jobNav-billing" ref={ref}>
      <button
        type="button"
        className={`jobNav-link jobNav-link--plan ${active || open ? 'is-active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {planLabel}
        <small>{open ? 'Up' : 'Down'}</small>
      </button>

      {open && (
        <div className="jobNav-billingMenu" role="menu">
          <p>Billing</p>
          <a href="/pricing" className={path === '/pricing' ? 'is-active' : ''} role="menuitem">
            <span>{t('pricing') || 'Pricing'}</span>
            <em>View</em>
          </a>
          <a href="/limits" className={path === '/limits' ? 'is-active' : ''} role="menuitem">
            <span>{usageLimitsLabel}</span>
            <em>View</em>
          </a>
        </div>
      )}
    </div>
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
          <div>
            <strong>{t('pricing') || 'Pricing'}</strong>
            <small>Plans, prices, and future paid options</small>
          </div>
          <em>View</em>
        </a>
        <a href="/limits" className={path === '/limits' ? 'is-active' : ''}>
          <span>02</span>
          <div>
            <strong>{usageLimitsLabel}</strong>
            <small>ATS checks, cover letters, and CV quotas</small>
          </div>
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

  const goTo = id => {
    if (id === 'dashboard') {
      onLogoClick?.()
      setPage('dashboard')
      return
    }

    setPage(id)
  }

  return (
    <>
      <header className="jobNav">
        <button
          type="button"
          className="jobNav-brand"
          onClick={() => goTo('dashboard')}
          aria-label={t('go_to_dashboard') || 'Go to dashboard'}
        >
          <span className="jobNav-brandMark">J</span>
          <span className="jobNav-brandText">
            <strong>Joblytics</strong>
            <small>Application workspace</small>
          </span>
        </button>

        <nav className="jobNav-links" aria-label={t('primary_navigation') || 'Primary navigation'}>
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`jobNav-link ${page === item.id ? 'is-active' : ''}`}
              onClick={() => goTo(item.id)}
            >
              {getLabel(t, item)}
            </button>
          ))}
          <AdminNavButton page={page} goTo={goTo} />
          <PlanDropdown />
        </nav>

        <div className="jobNav-right">
          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>
            New analysis
          </button>

          <div className="jobNav-menuWrap">
            <span>Account</span>
            <UserMenu onViewDashboard={() => goTo('history')} />
          </div>
        </div>
      </header>

      <nav className="jobNav-mobile" aria-label={t('mobile_navigation') || 'Mobile navigation'}>
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`jobNav-mobileItem ${page === item.id ? 'is-active' : ''}`}
            onClick={() => goTo(item.id)}
          >
            <span>{item.short}</span>
            <em>{getLabel(t, item)}</em>
          </button>
        ))}
        <AdminNavButton page={page} goTo={goTo} mobile />
        <button className={`jobNav-mobileItem ${planActive ? 'is-active' : ''}`} type="button" onClick={() => setMobilePlanOpen(true)}>
          <span>Plan</span>
          <em>{planLabel}</em>
        </button>
      </nav>

      {mobilePlanOpen && <MobilePlanSheet onClose={() => setMobilePlanOpen(false)} />}
    </>
  )
}
