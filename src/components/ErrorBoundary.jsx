import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400, letterSpacing: '-0.05em', color: 'var(--text-primary)', margin: '0 0 10px' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 24px' }}>
            An unexpected error occurred. Refreshing the page usually fixes this.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ minHeight: 44, padding: '0 24px', borderRadius: 999, border: 0, background: 'var(--text-primary)', color: 'var(--bg)', fontWeight: 900, cursor: 'pointer', fontSize: 14 }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
