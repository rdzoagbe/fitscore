import React from 'react'

function isChunkLoadError(error) {
  const msg = error?.message || ''
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    error?.name === 'ChunkLoadError'
  )
}

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
    if (isChunkLoadError(error)) {
      const key = 'joblytics_chunk_reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const isChunk = isChunkLoadError(this.state.error)
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400, letterSpacing: '-0.05em', color: 'var(--text-primary)', margin: '0 0 10px' }}>
            {isChunk ? 'Update available' : 'Something went wrong'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 24px' }}>
            {isChunk
              ? 'Joblytics was updated since you last loaded the page. Reload to get the latest version.'
              : 'An unexpected error occurred. Refreshing the page usually fixes this.'}
          </p>
          <button
            onClick={() => { sessionStorage.removeItem('joblytics_chunk_reload'); window.location.reload() }}
            style={{ minHeight: 44, padding: '0 24px', borderRadius: 999, border: 0, background: 'var(--text-primary)', color: 'var(--bg)', fontWeight: 900, cursor: 'pointer', fontSize: 14 }}
          >
            {isChunk ? 'Reload to update' : 'Reload page'}
          </button>
        </div>
      </div>
    )
  }
}
