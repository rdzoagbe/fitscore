import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function AuthModal({ initialMode = 'signin', onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const { t } = useLang()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [onClose])

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setSuccess(t('account_created'))
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 'clamp(24px,5vw,32px)', maxWidth: 420, width: '100%', position: 'relative', animation: 'fadeUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
<div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{t('or')}</span>
          <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
        </div>

                  <button
            type="button"
            onClick={async () => {
              const { error } = await signInWithGoogle()
              if (error) alert(error.message)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              marginBottom: 12
            }}
          >
            Continue with Google
          </button>

<input type="email" placeholder={t('email_placeholder')} value={email} onChange={e=>setEmail(e.target.value)} style={{ marginBottom: 8 }} />
        <input type="password" placeholder={t('password_placeholder')} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={{ marginBottom: 14 }} />

        {error && <p style={{ fontSize:13, color:'#ff6b6b', marginBottom:10, padding:'10px 12px', background:'rgba(255,107,107,0.08)', borderRadius:8 }}>{error}</p>}
        {success && <p style={{ fontSize:13, color:'#4caf7d', marginBottom:10, padding:'10px 12px', background:'rgba(76,175,125,0.08)', borderRadius:8 }}>{success}</p>}

        <button onClick={handleSubmit} disabled={loading||!email||!password} className="btn-primary" style={{ width:'100%' }}>
          {loading ? t('please_wait') : mode==='signin' ? t('sign_in_arrow') : t('create_account')}
        </button>

        <p style={{ fontSize:11, color:'var(--text-hint)', textAlign:'center', marginTop:14, lineHeight:1.6 }}>
          {t('auth_terms')}{' '}
          <a href="/privacy" style={{ color:'var(--text-muted)' }}>{t('privacy_policy')}</a>.
        </p>
      </div>
    </div>
  )
}
