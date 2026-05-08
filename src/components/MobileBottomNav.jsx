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
    { id: 'dashboard', icon: '✦', label: t('dashboard') || 'Dashboard', active: page === 'dashboard', onClick: () => setPage('dashboard') },
    { id: 'analyzer', icon: '🔍', label: t('analyze') || 'Analyze', active: page === 'analyzer', onClick: () => { onLogoClick ? onLogoClick() : setPage('analyzer') } },
    { id: 'history', icon: '📊', label: t('history') || 'History', active: page === 'history', onClick: () => setPage('history') },
    { id: 'coach', icon: '🎤', label: t('nav_coach') || 'Coach', active: page === 'coach', onClick: () => setPage('coach') },
    { id: 'more', icon: '⋯', label: t('more') || 'More', active: moreOpen, onClick: () => setMoreOpen(o => !o) }
  ]

  return (
    <>
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--pro-nav)', backdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-lg)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'stretch'
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={tab.onClick} style={{
            flex: 1, padding: '8px 3px 6px',
            background: tab.active ? 'var(--accent-soft)' : 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            color: tab.active ? 'var(--accent)' : 'var(--text-secondary)',
            fontFamily: 'inherit', minHeight: 58,
            transition: 'color 0.15s, background 0.15s', borderRadius: 14, position: 'relative'
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 9.5, fontWeight: tab.active ? 800 : 600 }}>{tab.label}</span>
            {tab.active && (
              <span style={{ position: 'absolute', top: 0, width: 24, height: 2, borderRadius: 2, background: 'var(--accent)' }} />
            )}
          </button>
        ))}
      </nav>

      {moreOpen && (
        <MoreSheet onClose={() => setMoreOpen(false)} setPage={setPage} />
      )}
    </>
  )
}

function MoreSheet({ onClose, setPage }) {
  const { t } = useLang()
  const { user, signOut } = useAuth()
  const { theme, changeTheme } = useTheme()

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease'
      }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', border: '1px solid var(--border-soft)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0))',
        animation: 'slideUp 0.25s ease',
        maxHeight: '75vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border)', margin: '0 auto 16px' }} />

        {user?.email && (
          <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-inverse)', fontWeight: 800, fontSize: 14, fontFamily: 'Syne, sans-serif'
            }}>
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('signed_in') || 'Signed in'}</p>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('theme') || 'Theme'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[
              { v: 'light', icon: '☀️', label: t('light') || 'Light' },
              { v: 'dark', icon: '🌙', label: t('dark') || 'Dark' },
              { v: 'system', icon: '⚙️', label: t('auto') || 'Auto' }
            ].map(o => (
              <button key={o.v} onClick={() => changeTheme(o.v)} className={`theme-choice ${theme === o.v ? 'is-active' : ''}`}>
                <span style={{ fontSize: 22 }}>{o.icon}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('language') || 'Language'}
          </p>
          <LangSelector inline />
        </div>

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
            marginTop: 14, padding: '12px', borderRadius: 14,
            background: 'var(--danger-soft)', border: '1px solid rgba(220,38,38,0.25)',
            color: 'var(--danger)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', width: '100%'
          }}>
            {t('sign_out') || 'Sign out'}
          </button>
        )}
      </div>
    </>
  )
}
