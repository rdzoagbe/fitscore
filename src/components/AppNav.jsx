import React from 'react'
import { useAuth } from '../context/AuthContext'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', label: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', label: 'Analyze' },
  { id: 'history', icon: '📊', label: 'History' },
  { id: 'coach', icon: '🎤', label: 'CV Coach' }
]

function getDisplayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')?.[0] ||
    'Roland'
  )
}

function getInitials(name) {
  return name
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'RO'
}

export default function AppNav({ page, setPage, onLogoClick }) {
  const { user } = useAuth()
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)

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
          aria-label="Go to dashboard"
        >
          <span className="jobNav-brandMark">J</span>
          <span>
            <strong>Joblytics</strong>
            <small>Career growth workspace</small>
          </span>
        </button>

        <nav className="jobNav-links" aria-label="Primary navigation">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`jobNav-link ${page === item.id ? 'is-active' : ''}`}
              onClick={() => goTo(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="jobNav-right">
          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>
            New check
          </button>

          <div className="jobNav-user">
            <span>Menu</span>
            <strong>{initials}</strong>
          </div>
        </div>
      </header>

      <nav className="jobNav-mobile" aria-label="Mobile navigation">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`jobNav-mobileItem ${page === item.id ? 'is-active' : ''}`}
            onClick={() => goTo(item.id)}
          >
            <span>{item.icon}</span>
            <em>{item.label}</em>
          </button>
        ))}
      </nav>
    </>
  )
}
