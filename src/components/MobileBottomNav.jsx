import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LangSelector from './LangSelector'

// Mobile-first bottom tab navigation. Only renders on screens ≤ 768px.
// Hidden on landing/auth pages via the parent App.
export default function MobileBottomNav({ page, setPage, onLogoClick }) {
  const { t } = useLang()
  const [moreOpen, setMoreOpen] = useState(false)

  const tabs = [
    { id: 'analyzer', icon: '🔍', label: t('analyze') || 'Analyze', active: page === 'analyzer', onClick: () => { onLogoClick ? onLogoClick() : setPage('analyzer') } },
    { id: 'dashboard', icon: '📊', label: t('history') || 'History', active: page === 'dashboard', onClick: () => setPage('dashboard') },
    { id: 'coach', icon: '🎤', label: t('nav_coach') || 'Coach', active: page === 'coach', onClick: () => setPage('coach') },
    { id: 'more', icon: '⋯', label: t('more') || 'More', active: moreOpen, onClick: () => setMoreOpen(o => !o) }
  ]

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(26,27,34,0.96)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'stretch'
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={tab.onClick} style={{
            flex: 1, padding: '8px 4px 6px',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: tab.active ? 'var(--accent)' : 'var(--text-secondary)',
            fontFamily: 'inherit', minHeight: 56,
            transition: 'color 0.15s'
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab.active ? 700 : 500 }}>{tab.label}</span>
            {tab.active && (
              <span style={{ position: 'absolute', top: 0, width: 24, height: 2, borderRadius: 2, background: 'var(--accent)' }} />
            )}
          </button>
        ))}
      </nav>

      {/* "More" sheet — slides up from bottom */}
      {moreOpen && (
        <MoreSheet onClose={() => setMoreOpen(false)} />
      )}
    </>
  )
}

function MoreSheet({ onClose }) {
  const { t } = useLang()
  const { user, signOut } = useAuth()
  const { theme, changeTheme } = useTheme()

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease'
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0))',
        animation: 'slideUp 0.25s ease',
        maxHeight: '75vh', overflowY: 'auto'
      }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border)', margin: '0 auto 16px' }} />

        {/* Account info */}
        {user?.email && (
          <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent-bg)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)', fontWeight: 700, fontSize: 14, fontFamily: 'Syne, sans-serif'
            }}>
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('signed_in') || 'Signed in'}</p>
            </div>
          </div>
        )}

        {/* Theme */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('theme') || 'Theme'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[
              { v: 'light', icon: '☀️', label: t('light') || 'Light' },
              { v: 'dark', icon: '🌙', label: t('dark') || 'Dark' },
              { v: 'system', icon: '⚙️', label: t('auto') || 'Auto' }
            ].map(o => (
              <button key={o.v} onClick={() => changeTheme(o.v)} style={{
                padding: '12px 4px', borderRadius: 12,
                border: `1px solid ${theme === o.v ? 'var(--accent)' : 'var(--border)'}`,
                background: theme === o.v ? 'var(--accent-bg)' : 'var(--bg-input)',
                color: theme === o.v ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}>
                <span style={{ fontSize: 22 }}>{o.icon}</span>
                <span style={{ fontSize: 11, fontWeight: theme === o.v ? 700 : 500 }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('language') || 'Language'}
          </p>
          <LangSelector inline />
        </div>

        {/* Links */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <a href="/privacy" style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔒 {t('privacy') || 'Privacy'}</span><span style={{ color: 'var(--text-hint)' }}>›</span>
          </a>
          <a href="/terms" style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
            <span>📋 {t('footer_terms') || 'Terms'}</span><span style={{ color: 'var(--text-hint)' }}>›</span>
          </a>
        </div>

        {user && (
          <button onClick={() => { signOut(); onClose() }} style={{
            marginTop: 14, padding: '12px', borderRadius: 12,
            background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
            color: '#ff6b6b', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', width: '100%'
          }}>
            {t('sign_out') || 'Sign out'}
          </button>
        )}
      </div>
    </>
  )
}
