import React from 'react'
import { useAuth } from '../context/AuthContext'
import LangSelector from './LangSelector'
import ThemeToggle from './ThemeToggle'

function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')?.[0] || 'User'
}

function getInitials(name) {
  return name.split(/[.\s_-]+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
}

export default function AppShellBar() {
  const { user, signOut } = useAuth()
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)

  const baseLink = {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: 750
  }

  return (
    <>
      <section className="appShellBar" aria-label="Global app preferences">
        <div className="appShellBar-inner">
          <div className="appShellBar-preferences">
            <span className="appShellBar-label">Preferences</span>
            <LangSelector />
            <ThemeToggle />
          </div>

          <details className="appShellBar-account">
            <summary className="appShellBar-accountButton">
              <span>{displayName}</span>
              <strong>{initials}</strong>
            </summary>
            <div className="appShellBar-accountPanel">
              <strong>{displayName}</strong>
              <span>{user?.email}</span>
              <div className="appShellBar-accountLinks">
                <a href="/privacy">Privacy policy</a>
                <a href="/terms">Terms of use</a>
                <a href="mailto:rolanddzoagbe@gmail.com">Contact support</a>
                <button type="button" onClick={() => signOut?.()}>Sign out</button>
              </div>
            </div>
          </details>
        </div>
      </section>

      <footer className="appShellFooter" aria-label="Global app footer">
        <div className="appShellFooter-inner">
          <span>© {new Date().getFullYear()} Joblytics · Made in France</span>
          <span className="appShellFooter-links">
            <a href="/privacy" style={baseLink}>Privacy</a>
            <a href="/terms" style={baseLink}>Terms</a>
            <a href="mailto:rolanddzoagbe@gmail.com" style={baseLink}>Contact</a>
          </span>
        </div>
      </footer>
    </>
  )
}
