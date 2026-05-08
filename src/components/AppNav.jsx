import React, { useEffect, useRef, useState } from 'react'
import { useLang } from '../context/LangContext'
import UserMenu from './UserMenu'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', labelKey: 'analyze', fallback: 'Analyze' },
  { id: 'history', icon: '📊', labelKey: 'history', fallback: 'History' },
  { id: 'coach', icon: '🎤', labelKey: 'nav_coach', fallback: 'CV Coach' }
]

function BillingDropdown() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const path = window.location.pathname
  const active = path === '/pricing' || path === '/limits'

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
        className={`jobNav-link ${active || open ? 'is-active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>💳</span>
        {t('billing') || 'Billing'}
        <small>{open ? '▲' : '▼'}</small>
      </button>

      {open && (
        <div className="jobNav-billingMenu" role="menu">
          <p>{t('billing') || 'Billing'}</p>
          <a href="/pricing" className={path === '/pricing' ? 'is-active' : ''} role="menuitem">
            <span>💳 {t('pricing') || 'Pricing'}</span>
            <em>›</em>
          </a>
          <a href="/limits" className={path === '/limits' ? 'is-active' : ''} role="menuitem">
            <span>🛡️ {t('limits') || 'Limits'}</span>
            <em>›</em>
          </a>
        </div>
      )}
    </div>
  )
}

export default function AppNav({ page, setPage, onLogoClick }) {
  const { t } = useLang()

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
          <span>
            <strong>Joblytics</strong>
            <small>{t('career_workspace') || 'Career growth workspace'}</small>
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
              <span>{item.icon}</span>
              {t(item.labelKey) || item.fallback}
            </button>
          ))}
          <BillingDropdown />
        </nav>

        <div className="jobNav-right">
          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>
            {t('new_check') || 'New check'}
          </button>

          <div className="jobNav-menuWrap">
            <span>{t('menu') || 'Menu'}</span>
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
            <span>{item.icon}</span>
            <em>{t(item.labelKey) || item.fallback}</em>
          </button>
        ))}
        <a className="jobNav-mobileItem" href="/pricing">
          <span>💳</span>
          <em>{t('billing') || 'Billing'}</em>
        </a>
      </nav>
    </>
  )
}
