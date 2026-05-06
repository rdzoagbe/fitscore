import React from 'react'
import UserMenu from './UserMenu'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', label: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', label: 'Analyze' },
  { id: 'history', icon: '📊', label: 'History' },
  { id: 'coach', icon: '🎤', label: 'CV Coach' }
]

export default function AppNav({ page, setPage, onLogoClick }) {
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

          <div className="jobNav-menuWrap">
            <span>Menu</span>
            <UserMenu onViewDashboard={() => goTo('history')} />
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
