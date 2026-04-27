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
      borderRadius: 20, padding: '6px 14px',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      fontSize: 13, fontWeight: active ? 600 : 400,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'all 0.15s', whiteSpace: 'nowrap'
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)' }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  )
}

function SettingsPanel({ onClose }) {
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
      minWidth: 240, boxShadow: '0 12px 32px var(--shadow)',
      animation: 'fadeUp 0.15s ease'
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        {t('settings') || 'Settings'}
      </p>

      {/* Theme */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('theme') || 'Theme'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {[
            { v: 'light', icon: '☀️', label: t('light') || 'Light' },
            { v: 'dark',  icon: '🌙', label: t('dark') || 'Dark' },
            { v: 'system',icon: '⚙️', label: t('auto') || 'Auto' }
          ].map(o => (
            <button key={o.v} onClick={() => changeTheme(o.v)} style={{
              padding: '8px 4px', borderRadius: 10, border: `1px solid ${theme===o.v?'var(--accent)':'var(--border)'}`,
              background: theme===o.v?'var(--accent-bg)':'var(--bg-input)',
              color: theme===o.v?'var(--accent)':'var(--text-muted)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 18 }}>{o.icon}</span>
              <span style={{ fontSize: 10, fontWeight: theme===o.v?600:400 }}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{t('language') || 'Language'}</p>
        <LangSelector inline />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <a href="/privacy" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '4px 0' }}>{t('privacy')}</a>
        <a href="/terms" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '4px 0' }}>{t('footer_terms') || 'Terms of service'}</a>
      </div>
    </div>
  )
}

function AvatarMenu({ onClose }) {
  const { user, signOut } = useAuth()
  const { t } = useLang()
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const displayName = user?.email?.split('@')[0] || 'User'

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 6, zIndex: 80,
      minWidth: 200, boxShadow: '0 12px 32px var(--shadow)',
      animation: 'fadeUp 0.15s ease'
    }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{displayName}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
      </div>
      <button onClick={() => { onClose(); signOut() }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ff6b6b', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
        🚪 {t('sign_out')}
      </button>
    </div>
  )
}

export default function TopNav({ page, setPage }) {
  const { user } = useAuth()
  const { t } = useLang()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const initials = (user?.email || 'U').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        @media (max-width: 480px) { .nav-label { display: none; } }
      `}</style>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(26,27,34,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 clamp(12px,4vw,32px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, gap: 8
      }}>
        {/* Logo */}
        <button onClick={() => setPage('analyzer')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Fit<span style={{ color: 'var(--accent)' }}>Score</span>
          </span>
        </button>

        {/* Center nav links */}
        <nav style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <NavLink icon="🔍" label={t('analyze') || 'Analyze'} active={page==='analyzer'} onClick={() => setPage('analyzer')} />
          <NavLink icon="📊" label={t('history') || 'History'} active={page==='dashboard'} onClick={() => setPage('dashboard')} />
          <NavLink icon="🎤" label={t('nav_coach') || 'CV Coach'} active={page==='coach'} onClick={() => setPage('coach')} />
        </nav>

        {/* Right side controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {/* Settings */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setSettingsOpen(o => !o); setAvatarOpen(false) }} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: settingsOpen ? 'var(--accent-bg)' : 'var(--bg-input)',
              border: `1px solid ${settingsOpen ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}>⚙️</button>
            {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
          </div>

          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setAvatarOpen(o => !o); setSettingsOpen(false) }} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--accent-bg)', border: `1px solid ${avatarOpen ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}>{initials}</button>
            {avatarOpen && <AvatarMenu onClose={() => setAvatarOpen(false)} />}
          </div>
        </div>
      </header>
    </>
  )
}
