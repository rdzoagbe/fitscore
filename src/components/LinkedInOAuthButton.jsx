import React from 'react'

export default function LinkedInOAuthButton({ className = '', style = {}, children = 'Continue with LinkedIn' }) {
  return (
    <button
      type="button"
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 10,
        border: '1px solid var(--border, rgba(255,255,255,0.12))',
        background: 'var(--bg-input, #2b2d38)',
        color: 'var(--text-primary, #fff)',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        ...style
      }}
      onClick={() => {
        window.location.href = '/api/auth/linkedin/start'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A66C2',
          color: '#fff',
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1
        }}
      >
        in
      </span>
      {children}
    </button>
  )
}
