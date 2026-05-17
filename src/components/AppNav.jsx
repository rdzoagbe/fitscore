import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import LangSelector from './LangSelector'
import ThemeToggle from './ThemeToggle'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'nav_dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', labelKey: 'nav_analyze', fallback: 'Analyze' },
  { id: 'history', icon: '📊', labelKey: 'nav_history', fallback: 'History' },
  { id: 'coach', icon: '🎤', labelKey: 'nav_coach', fallback: 'CV Coach' }
]

function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')?.[0] || 'User'
}

function getInitials(name) {
  return name.split(/[.\s_-]+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
}

export default function AppNav({ page, setPage, onLogoClick }) {
  const { user } = useAuth()
  const { t } = useLang()
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)
  const label = (key, fallback) => {
    const value = t(key)
    return value && value !== key ? value : fallback
  }

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
          <div className="jobNav-controls" aria-label="Preferences">
            <LangSelector />
            <ThemeToggle />
          </div>

          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>
            {label('new_check', 'New check')}
          </button>

          <div className="jobNav-user" title={displayName}>
            <span>{displayName}</span>
            <strong>{initials}</strong>
          </div>
        </div>
      </header>

      <nav className="jobNav-mobile" aria-label="Mobile navigation">
        {navItems.map(item => (
          <button key={item.id} type="button" className={`jobNav-mobileItem ${page === item.id ? 'is-active' : ''}`} onClick={() => goTo(item.id)}>
            <span>{item.icon}</span>
            <em>{label(item.labelKey, item.fallback)}</em>
          </button>
        ))}
      </nav>
    </>
  )
}
