import React from 'react'
import { useLang } from '../context/LangContext'
import UserMenu from './UserMenu'
import './AppNav.css'

const navItems = [
  { id: 'dashboard', icon: '✦', labelKey: 'dashboard', fallback: 'Dashboard' },
  { id: 'analyzer', icon: '🔍', labelKey: 'analyze', fallback: 'Analyze' },
  { id: 'history', icon: '📊', labelKey: 'history', fallback: 'History' },
  { id: 'coach', icon: '🎤', labelKey: 'nav_coach', fallback: 'CV Coach' }
]

export default function AppNav({ page, setPage, onLogoClick }) {
  const { t } = useLang()

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
          aria-label={t('go_to_dashboard') || 'Go to dashboard'}
        >
          <span className="jobNav-brandMark">J</span>
          <span>
            <strong>Joblytics</strong>
            <small>{t('career_workspace') || 'Career growth workspace'}</small>
          </span>
        </button>

        <nav className="jobNav-links" aria-label={t('primary_navigation') || 'Primary navigation'}>
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`jobNav-link ${page === item.id ? 'is-active' : ''}`}
              onClick={() => goTo(item.id)}
            >
              <span>{item.icon}</span>
              {t(item.labelKey) || item.fallback}
            </button>
          ))}
        </nav>

        <div className="jobNav-right">
          <button type="button" className="jobNav-newCheck" onClick={() => goTo('analyzer')}>
            {t('new_check') || 'New check'}
          </button>

          <div className="jobNav-menuWrap">
            <span>{t('menu') || 'Menu'}</span>
            <UserMenu onViewDashboard={() => goTo('history')} />
          </div>
        </div>
      </header>

      <nav className="jobNav-mobile" aria-label={t('mobile_navigation') || 'Mobile navigation'}>
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`jobNav-mobileItem ${page === item.id ? 'is-active' : ''}`}
            onClick={() => goTo(item.id)}
          >
            <span>{item.icon}</span>
            <em>{t(item.labelKey) || item.fallback}</em>
          </button>
        ))}
      </nav>
    </>
  )
}
