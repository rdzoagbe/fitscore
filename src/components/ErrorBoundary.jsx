import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    try {
      console.error('Joblytics render error:', error, info)
      const events = JSON.parse(localStorage.getItem('joblytics_analytics_events') || '[]')
      events.push({
        name: 'frontend_crash',
        payload: { message: error?.message || 'Unknown render error' },
        ts: new Date().toISOString(),
        path: window.location.pathname + window.location.hash
      })
      localStorage.setItem('joblytics_analytics_events', JSON.stringify(events.slice(-250)))
    } catch {
      // never let error reporting crash the fallback UI
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <section style={{ width: 'min(560px, 100%)', padding: 24, borderRadius: 24, border: '1px solid var(--border-soft)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>Something went wrong</p>
          <h1 style={{ margin: '10px 0', fontFamily: 'Syne, Inter, system-ui, sans-serif', fontSize: 32, letterSpacing: '-.06em' }}>Joblytics could not render this page.</h1>
          <p style={{ margin: '0 0 18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Reload the app. If the issue continues, contact support and include the page you were on.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => window.location.reload()} style={primary}>Reload app</button>
            <a href="/contact" style={secondary}>Contact support</a>
          </div>
        </section>
      </div>
    )
  }
}

const primary = { minHeight: 42, padding: '0 16px', border: 0, borderRadius: 999, background: 'var(--accent)', color: 'var(--text-inverse)', fontWeight: 900, cursor: 'pointer' }
const secondary = { minHeight: 42, display: 'inline-flex', alignItems: 'center', padding: '0 16px', border: '1px solid var(--border)', borderRadius: 999, background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 900, textDecoration: 'none' }
