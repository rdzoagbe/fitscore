import React from 'react'
import './AppShellBar.css'

export default function AppShellBar() {
  return (
    <footer className="appShellFooter" aria-label="Global app footer">
      <div className="appShellFooter-inner">
        <span>© {new Date().getFullYear()} Joblytics · Made in France</span>
        <span className="appShellFooter-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:rolanddzoagbe@gmail.com">Contact</a>
        </span>
      </div>
    </footer>
  )
}
