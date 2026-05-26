import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangSelector from './LangSelector'
import ThemeToggle from './ThemeToggle'
import { getUserDisplayName, getUserInitials, getUserEmail } from '../lib/userProfile'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'nav_dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: 'AI', labelKey: 'nav_analyze', fallback: 'Analyze' },
  { id: 'history', icon: 'H', labelKey: 'nav_history', fallback: 'History' },
  { id: 'coach', icon: 'CV', labelKey: 'nav_coach', fallback: 'CV Coach' },
  { id: 'messages', icon: 'M', labelKey: 'nav_messages', fallback: 'Messages' },
  { id: 'profile', icon: 'in', labelKey: 'nav_profile', fallback: 'LinkedIn Profile' }
]

const workspaceItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'nav_dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: 'AI', labelKey: 'nav_analyze', fallback: 'Analyze' },
  { id: 'history', icon: 'H', labelKey: 'nav_history', fallback: 'History' },
  { id: 'coach', icon: 'CV', labelKey: 'nav_coach', fallback: 'CV Coach' },
  { id: 'profile', icon: 'in', labelKey: 'nav_profile', fallback: 'LinkedIn Profile' },
  { id: 'billing', icon: '€', labelKey: 'nav_billing', fallback: 'Billing' }
]

const mobileNavItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'nav_dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: 'AI', labelKey: 'nav_analyze', fallback: 'Analyze' },
  { id: 'coach', icon: 'CV', labelKey: 'nav_coach', fallback: 'CV Coach' },
  { id: 'messages', icon: 'M', labelKey: 'nav_messages', fallback: 'Messages' },
  { id: 'profile', icon: 'in', labelKey: 'nav_profile', fallback: 'Profile' }
]

export default function AppNav({ page, setPage, onLogoClick }) {
  const { user, signOut } = useAuth()
  const { t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = getUserDisplayName(user)
  const initials = getUserInitials(displayName)
  const accountEmail = getUserEmail(user)
  const label = (key, fallback) => t(key, fallback)

  const closeMenu = () => setMenuOpen(false)

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

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

          <div className={`jobNav-account ${menuOpen ? 'is-open' : ''}`}>
            <button type="button" className="jobNav-menuButton" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
              <span>{t('menu_label', 'Menu')}</span>
              <strong>{initials}</strong>
            </button>

            {menuOpen && <button type="button" className="jobNav-menuOverlay" aria-label={t('close_menu', 'Close menu')} onClick={closeMenu} />}

            {menuOpen && (
              <div className="jobNav-menuPanel" role="menu">
                <div className="jobNav-menuIdentity"><strong>{displayName}</strong><span>{accountEmail}</span></div>

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
                  <button type="button" onClick={() => goTo('contact')} className={page === 'contact' ? 'is-active' : ''}>
                    <span className="jobNav-menuGlyph">?</span>
                    {t('nav_support', 'Support')}
                  </button>
                  <a href="/legal" onClick={closeMenu}>{t('legal_notice', 'Legal notice')}</a>
                  <a href="/privacy" onClick={closeMenu}>{t('privacy_policy_full', 'Privacy policy')}</a>
                  <a href="/terms" onClick={closeMenu}>{t('terms_of_use', 'Terms of use')}</a>
                </div>

                <button type="button" className="jobNav-signOut" onClick={handleSignOut}>{t('sign_out', 'Sign out')}</button>
              </div>
            )}
          </div>
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
