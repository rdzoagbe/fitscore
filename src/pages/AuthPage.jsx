import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const { t } = useLang()
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
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(20px,5vw,40px)', transition: 'background 0.3s' }}>

      <div style={{ position: 'fixed', top: 20, right: 20, display: 'flex', gap: 8 }}>
        <LangSelector />
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(24px,6vw,32px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 6 }}>
            Job<span style={{ color: 'var(--accent)' }}>lytics</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{t('tagline')}</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6 }}>
            {t('auth_subtitle')}
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 'clamp(20px,5vw,32px)' }}>

          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {[['signin', t('sign_in')], ['signup', t('sign_up')]].map(([m, label]) => (
<div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{t('or')}</span>
            <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
          </div>

          <input type="email" placeholder={t('email_placeholder')} value={email} onChange={e=>setEmail(e.target.value)} style={{ marginBottom: 10 }} />
          <input type="password" placeholder={t('password_placeholder')} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} style={{ marginBottom: 18 }} />

          {error && <p style={{ fontSize:13, color:'#ff6b6b', marginBottom:12, lineHeight:1.4, padding:'10px 12px', background:'rgba(255,107,107,0.08)', borderRadius:8 }}>{error}</p>}
          {success && <p style={{ fontSize:13, color:'#4caf7d', marginBottom:12, lineHeight:1.4, padding:'10px 12px', background:'rgba(76,175,125,0.08)', borderRadius:8 }}>{success}</p>}

          <button onClick={handleSubmit} disabled={loading||!email||!password} className="btn-primary" style={{ width:'100%' }}>
            {loading ? t('please_wait') : mode==='signin' ? t('sign_in_arrow') : t('create_account')}
          </button>
        </div>

        <p style={{ fontSize:11, color:'var(--text-hint)', textAlign:'center', marginTop:20, lineHeight:1.7 }}>
          {t('auth_terms')}{' '}
          <a href="/privacy" style={{ color:'var(--text-muted)', textDecoration:'underline' }}>{t('privacy_policy')}</a>.
          {' '}{t('auth_data_safe')}
        </p>
      </div>
    </div>
  )
}
