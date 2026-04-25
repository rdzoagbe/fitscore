import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess('Account created! Check your email to confirm.')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: '#c8f542' }}>Score</span>
          </h1>
          <p style={{ fontSize: 12, color: '#555', marginTop: 4, letterSpacing: '0.06em' }}>KNOW BEFORE YOU APPLY</p>
        </div>

        {/* Card */}
        <div style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 24px' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? '#c8f542' : 'transparent',
                color: mode === m ? '#0f0f0f' : '#666',
                fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
              }}>
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} style={{
            width: '100%', padding: '12px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f0f0f0', fontSize: 14, cursor: 'pointer', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 12, color: '#444' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Email/password */}
          <div style={{ marginBottom: 12 }}>
            <input
              type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', WebkitAppearance: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', background: '#1f1f1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f0f0f0', fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', WebkitAppearance: 'none' }}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: '#ff7070', marginBottom: 12, lineHeight: 1.4 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: '#4caf7d', marginBottom: 12, lineHeight: 1.4 }}>{success}</p>}

          <button onClick={handleSubmit} disabled={loading || !email || !password} style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: (!loading && email && password) ? '#c8f542' : 'rgba(255,255,255,0.06)',
            color: (!loading && email && password) ? '#0f0f0f' : '#444',
            border: 'none', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
            cursor: (!loading && email && password) ? 'pointer' : 'not-allowed'
          }}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        {/* Legal */}
        <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          By continuing you agree to our{' '}
          <a href="/privacy" style={{ color: '#666', textDecoration: 'underline' }}>Privacy Policy</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: '#666', textDecoration: 'underline' }}>Terms of Use</a>.
          Your data is stored securely and never sold.
        </p>
      </div>
    </div>
  )
}
