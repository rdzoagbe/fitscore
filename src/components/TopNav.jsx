import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'
import LangSelector from './LangSelector'

function NavLink({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'var(--accent-bg)' : 'none',
      border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
      borderRadius: 20, padding: '7px 16px',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      fontSize: 13, fontWeight: active ? 600 : 500,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 7,
      transition: 'all 0.15s', whiteSpace: 'nowrap'
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
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
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 16, zIndex: 80,
      minWidth: 280, boxShadow: '0 12px 40px var(--shadow)',
      animation: 'fadeUp 0.15s ease'
    }}>
      {/* Account header */}
      {user?.email && (
        <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent-bg)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontWeight: 700, fontSize: 12, fontFamily: 'Syne, sans-serif'
          }}>
            {user.email.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('signed_in') || 'Signed in'}</p>
          </div>
        </div>
      )}

      {/* Theme */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('theme') || 'Theme'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {[
            { v: 'light', icon: '☀️', label: t('light') || 'Light' },
            { v: 'dark', icon: '🌙', label: t('dark') || 'Dark' },
            { v: 'system', icon: '⚙️', label: t('auto') || 'Auto' }
          ].map(o => (
            <button key={o.v} onClick={() => changeTheme(o.v)} style={{
              padding: '8px 4px', borderRadius: 10,
              border: `1px solid ${theme === o.v ? 'var(--accent)' : 'var(--border)'}`,
              background: theme === o.v ? 'var(--accent-bg)' : 'var(--bg-input)',
              color: theme === o.v ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 16 }}>{o.icon}</span>
              <span style={{ fontSize: 10, fontWeight: theme === o.v ? 600 : 400 }}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          {t('language') || 'Language'}
        </p>
        <LangSelector inline />
      </div>

      {/* Footer links */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <a href="/privacy" style={{ padding: '8px 0', fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          🔒 {t('privacy') || 'Privacy'}
        </a>
        <a href="/terms" style={{ padding: '8px 0', fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          📋 {t('footer_terms') || 'Terms'}
        </a>
        {user && (
          <button onClick={() => { signOut(); onClose() }} style={{
            marginTop: 6, padding: '10px', borderRadius: 10,
            background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
            color: '#ff6b6b', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            {t('sign_out') || 'Sign out'}
          </button>
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
    <header className="desktop-top-nav" style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(26,27,34,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 clamp(16px,4vw,32px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 56, gap: 12
    }}>
      {/* Logo */}
      <button onClick={() => { onLogoClick ? onLogoClick() : setPage('analyzer') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Job<span style={{ color: 'var(--accent)' }}>lytics</span>
        </span>
      </button>

      {/* Center nav links */}
      <nav style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <NavLink icon="🔍" label={t('analyze') || 'Analyze'} active={page === 'analyzer'} onClick={() => { onLogoClick ? onLogoClick() : setPage('analyzer') }} />
        <NavLink icon="📊" label={t('history') || 'History'} active={page === 'dashboard'} onClick={() => setPage('dashboard')} />
        <NavLink icon="🎤" label={t('nav_coach') || 'CV Coach'} active={page === 'coach'} onClick={() => setPage('coach')} />
</nav>

      {/* Single user menu — combines settings + avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setMenuOpen(o => !o)} style={{
          height: 36, padding: '0 6px 0 12px', borderRadius: 22,
          background: menuOpen ? 'var(--accent-bg)' : 'var(--bg-input)',
          border: `1px solid ${menuOpen ? 'var(--accent)' : 'var(--border)'}`,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.15s'
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('menu') || 'Menu'}</span>
          <span style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--accent-bg)', color: 'var(--accent)',
            fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{initials}</span>
        </button>
        {menuOpen && <UserMenu onClose={() => setMenuOpen(false)} />}
      </div>
    </header>
  )
}
