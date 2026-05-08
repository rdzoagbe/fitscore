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

function BillingNavDropdown() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const path = window.location.pathname
  const active = path === '/pricing' || path === '/limits'

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const linkStyle = {
    minHeight: 44,
    padding: '9px 12px',
    borderRadius: 14,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    fontSize: 13,
    fontWeight: 800
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className={`nav-pill ${active || open ? 'is-active' : ''}`}>
        <span style={{ fontSize: 14 }}>💳</span>
        <span>{t('billing') || 'Billing'}</span>
        <span style={{ fontSize: 10, opacity: 0.8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 260,
          padding: 10,
          borderRadius: 20,
          border: '1px solid var(--border-soft)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 140
        }}>
          <p style={{ margin: '2px 8px 8px', color: 'var(--text-muted)', fontSize: 10, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t('billing') || 'Billing'}
          </p>
          <a href="/pricing" style={{ ...linkStyle, background: path === '/pricing' ? 'var(--accent-soft)' : 'transparent', color: path === '/pricing' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <span>💳 {t('pricing') || 'Pricing'}</span><span style={{ color: 'var(--text-hint)' }}>›</span>
          </a>
          <a href="/limits" style={{ ...linkStyle, background: path === '/limits' ? 'var(--accent-soft)' : 'transparent', color: path === '/limits' ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <span>🛡️ {t('limits') || 'Limits'}</span><span style={{ color: 'var(--text-hint)' }}>›</span>
          </a>
        </div>
      )}
    </div>
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
        <a href="/pricing">💳 {t('pricing') || 'Pricing'}</a>
        <a href="/limits">🛡️ {t('limits') || 'Limits'}</a>
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
        <BillingNavDropdown />
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
