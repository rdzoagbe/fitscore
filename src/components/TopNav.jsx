import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'
import LangSelector from './LangSelector'

function NavLink({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`nav-pill ${active ? 'is-active' : ''}`}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

// Unified user menu — combines Settings + Account
function UserMenu({ onClose }) {
  const { user, signOut } = useAuth()
  const { theme, changeTheme } = useTheme()
  const { t } = useLang()
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  return (
    <div ref={ref} className="user-menu-panel">
      {user?.email && (
        <div className="user-menu-account">
          <div className="user-menu-avatar">{user.email.slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p>{user.email}</p>
            <span>{t('signed_in') || 'Signed in'}</span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <p className="user-menu-label">{t('theme') || 'Theme'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {[
            { v: 'light', icon: '☀️', label: t('light') || 'Light' },
            { v: 'dark', icon: '🌙', label: t('dark') || 'Dark' },
            { v: 'system', icon: '⚙️', label: t('auto') || 'Auto' }
          ].map(o => (
            <button key={o.v} onClick={() => changeTheme(o.v)} className={`theme-choice ${theme === o.v ? 'is-active' : ''}`}>
              <span style={{ fontSize: 16 }}>{o.icon}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p className="user-menu-label">{t('language') || 'Language'}</p>
        <LangSelector inline />
      </div>

      <div className="user-menu-links">
        <a href="/privacy">🔒 {t('privacy') || 'Privacy'}</a>
        <a href="/terms">📋 {t('footer_terms') || 'Terms'}</a>
        {user && (
          <button onClick={() => { signOut(); onClose() }}>{t('sign_out') || 'Sign out'}</button>
        )}
      </div>
    </div>
  )
}

export default function TopNav({ page, setPage, onLogoClick }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <header className="desktop-top-nav app-nav">
      <button className="nav-brand" onClick={() => { onLogoClick ? onLogoClick() : setPage('analyzer') }}>
        <span className="nav-logo">J</span>
        <span>
          <strong>Joblytics</strong>
          <small>{t('career_workspace') || 'Career growth workspace'}</small>
        </span>
      </button>

      <nav className="nav-center" aria-label={t('primary_navigation') || 'Primary navigation'}>
        <NavLink icon="✦" label={t('dashboard') || 'Dashboard'} active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
        <NavLink icon="🔍" label={t('analyze') || 'Analyze'} active={page === 'analyzer'} onClick={() => { onLogoClick ? onLogoClick() : setPage('analyzer') }} />
        <NavLink icon="📊" label={t('history') || 'History'} active={page === 'history'} onClick={() => setPage('history')} />
        <NavLink icon="🎤" label={t('nav_coach') || 'CV Coach'} active={page === 'coach'} onClick={() => setPage('coach')} />
      </nav>

      <div className="nav-actions">
        <button className="nav-new-check" onClick={() => { onLogoClick ? onLogoClick() : setPage('analyzer') }}>
          {t('new_check') || 'New check'}
        </button>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMenuOpen(o => !o)} className={`nav-menu-btn ${menuOpen ? 'is-active' : ''}`}>
            <span>{t('menu') || 'Menu'}</span>
            <span className="nav-avatar">{initials}</span>
          </button>
          {menuOpen && <UserMenu onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </header>
  )
}
