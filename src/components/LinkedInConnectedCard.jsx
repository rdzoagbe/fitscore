import React, { useEffect, useState } from 'react'

export default function LinkedInConnectedCard({ compact = false }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  async function refresh() {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/linkedin/me')
      const data = await response.json().catch(() => ({}))
      setProfile(data.connected ? data.profile : null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  async function disconnect() {
    await fetch('/api/auth/linkedin/logout', { method: 'POST' })
    setProfile(null)
  }

  if (loading) {
    return compact ? null : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Checking LinkedIn connection...</p>
  }

  if (!profile) {
    return (
      <button type="button" onClick={() => { window.location.href = '/api/auth/linkedin/start' }} style={buttonStyle}>
        <span style={linkedInIcon}>in</span>
        Connect LinkedIn account
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '8px 10px' : '12px 14px', border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg-input)' }}>
      {profile.picture ? <img src={profile.picture} alt="" style={{ width: compact ? 28 : 40, height: compact ? 28 : 40, borderRadius: '50%', objectFit: 'cover' }} /> : <span style={linkedInIcon}>in</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'var(--text-primary)', fontSize: compact ? 12 : 14, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          LinkedIn connected{profile.name ? ` · ${profile.name}` : ''}
        </p>
        {profile.email && <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>}
      </div>
      <button type="button" onClick={disconnect} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>
        Disconnect
      </button>
    </div>
  )
}

const linkedInIcon = {
  width: 22,
  height: 22,
  borderRadius: 5,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0A66C2',
  color: '#fff',
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1
}

const buttonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit'
}
