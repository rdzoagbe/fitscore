import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LinkedInOAuthButton({
  children = 'Connect LinkedIn account',
  style = {},
  className = ''
}) {
  const { signInWithLinkedIn } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleLinkedInLogin(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signInWithLinkedIn()
      if (error) {
        alert(error.message || 'LinkedIn sign-in failed.')
        setLoading(false)
      }
    } catch (err) {
      alert(err.message || 'LinkedIn sign-in failed.')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLinkedInLogin}
      disabled={loading}
      className={className}
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text-primary)',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontFamily: 'Syne, sans-serif',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: loading ? 0.7 : 1,
        ...style
      }}
    >
      <span
        style={{
          background: '#0A66C2',
          color: '#fff',
          width: 16,
          height: 16,
          borderRadius: 3,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800
        }}
      >
        in
      </span>
      {loading ? 'Connecting...' : children}
    </button>
  )
}
