import React, { useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangSelector from './LangSelector'
import ThemeToggle from './ThemeToggle'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'nav_dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', labelKey: 'nav_analyze', fallback: 'Analyze' },
  { id: 'history', icon: '📊', labelKey: 'nav_history', fallback: 'History' },
  { id: 'coach', icon: '🎤', labelKey: 'nav_coach', fallback: 'CV Coach' },
  { id: 'messages', icon: '💬', labelKey: 'nav_messages', fallback: 'Messages' },
  { id: 'profile', icon: 'in', labelKey: 'nav_profile', fallback: 'LinkedIn Profile' }
]

const workspaceItems = [
  ...navItems,
  { id: 'billing', icon: '💳', labelKey: 'nav_billing', fallback: 'Billing' }
]

const mobileNavItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'nav_dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', labelKey: 'nav_analyze', fallback: 'Analyze' },
  { id: 'coach', icon: '🎤', labelKey: 'nav_coach', fallback: 'CV Coach' },
  { id: 'messages', icon: '💬', labelKey: 'nav_messages', fallback: 'Messages' },
  { id: 'profile', icon: 'in', labelKey: 'nav_profile', fallback: 'Profile' }
]

function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')?.[0] || 'User'
}

function getInitials(name) {
  return name.split(/[.\s_-]+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
}

export default function AppNav({ page, setPage, onLogoClick }) {
  const { user, signOut } = useAuth()
  const { t } = useLang()
  const accountMenuRef = useRef(null)
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)
  const label = (key, fallback) => t(key, fallback)

  const closeMenu = () => {
    if (accountMenuRef.current) accountMenuRef.current.open = false
  }

  const goTo = id => {
    closeMenu()
    if (id === 'dashboard') {
      onLogoClick?.()
      setPage('dashboard')
      return
    }
    setPage(id)
  }

  const handleSignOut = () => {
    closeMenu()
    signOut?.()
  }

  return (
    <>
      <header className="jobNav">
        <button type="button" className="jobNav-brand" onClick={() => goTo('dashboard')} aria-label="Go to dashboard">
          <span className="jobNav-brandMark">J</span>
          <span>
            <strong>Joblytics</strong>
            <small>{label('career_workspace', 'Career growth workspace')}</small>
          </span>
        </button>

        <nav className="jobNav-links" aria-label="Primary navigation">
          {navItems.map(item => (
            <button key={item.id} type="button" className={`jobNav-link ${page === item.id ? 'is-active' : ''}`} onClick={() => goTo(item.id)}>
              <span>{item.icon}</span>
              {label(item.labelKey, item.fallback)}
            </button>
          ))}
        </nav>

        <div className="jobNav-right">
          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>{label('new_check', 'New check')}</button>

          <details className="jobNav-account" ref={accountMenuRef}>
            <summary className="jobNav-menuButton"><span>{t('menu_label', 'Menu')}</span><strong>{initials}</strong></summary>

            <div className="jobNav-menuPanel" role="menu">
              <div className="jobNav-menuIdentity"><strong>{displayName}</strong><span>{user?.email}</span></div>

              <div className="jobNav-menuSection">
                <p>{t('preferences', 'Preferences')}</p>
                <div className="jobNav-menuControls"><LangSelector /><ThemeToggle /></div>
              </div>

              <div className="jobNav-menuSection">
                <p>{t('workspace', 'Workspace')}</p>
                {workspaceItems.map(item => (
                  <button key={item.id} type="button" onClick={() => goTo(item.id)} className={page === item.id ? 'is-active' : ''}>
                    <span>{item.icon}</span>
                    {label(item.labelKey, item.fallback)}
                  </button>
                ))}
              </div>

              <div className="jobNav-menuSection">
                <p>{t('legal_support', 'Legal & support')}</p>
                <a href="/legal" onClick={closeMenu}>{t('legal_notice', 'Legal notice')}</a>
                <a href="/privacy" onClick={closeMenu}>{t('privacy_policy_full', 'Privacy policy')}</a>
                <a href="/terms" onClick={closeMenu}>{t('terms_of_use', 'Terms of use')}</a>
                <button type="button" onClick={() => goTo('contact')}>💬 {t('contact_support', 'Contact support')}</button>
              </div>

              <button type="button" className="jobNav-signOut" onClick={handleSignOut}>{t('sign_out', 'Sign out')}</button>
            </div>
          </details>
        </div>
      </header>

      <nav className="jobNav-mobile" aria-label="Mobile navigation">
        {mobileNavItems.map(item => (
          <button key={item.id} type="button" className={`jobNav-mobileItem ${page === item.id ? 'is-active' : ''}`} onClick={() => goTo(item.id)}>
            <span>{item.icon}</span><em>{label(item.labelKey, item.fallback)}</em>
          </button>
        ))}
      </nav>
    </>
  )
}
