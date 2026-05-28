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
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, #0f0f0f)', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h2 style={{ color: 'var(--text-primary, #fff)', marginBottom: 8, fontSize: 20 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary, #888)', marginBottom: 24, lineHeight: 1.6 }}>An unexpected error occurred. Your data is safe — reload the page to continue.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{ textAlign: 'left', background: '#1a1a1a', color: '#ef4444', padding: '12px 14px', borderRadius: 8, fontSize: 12, overflow: 'auto', marginBottom: 20 }}>{String(this.state.error)}</pre>
          )}
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '12px 28px', borderRadius: 12, background: 'var(--accent, #6c63ff)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Reload page</button>
        </div>
      </div>
    )
  }
}
