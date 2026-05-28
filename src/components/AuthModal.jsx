import React, { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const passwordWords = [
  'Atlas', 'Noble', 'Cedar', 'Quartz', 'Signal', 'Harbor', 'Vector', 'Falcon',
  'River', 'Orbit', 'Summit', 'Vertex', 'Anchor', 'Beacon', 'Cipher', 'Meadow',
  'Forest', 'Copper', 'Marble', 'Rocket', 'Bridge', 'Castle', 'Silver', 'Tundra'
]
const passwordSymbols = ['!', '@', '#', '$', '%', '&', '*', '?']
const weakPasswordWords = ['password', 'passw0rd', 'qwerty', 'azerty', 'admin', 'letmein', 'welcome', 'joblytics', 'summer', 'winter', 'spring', 'autumn', 'football', 'monkey', 'dragon']
const weakSequences = ['123456', '234567', '345678', 'abcdef', 'qwerty', 'azerty', '987654', '111111', '000000']

function secureRandom(max) {
  if (globalThis.crypto?.getRandomValues) {
    const array = new Uint32Array(1)
    globalThis.crypto.getRandomValues(array)
    return array[0] % max
  }
  return Math.floor(Math.random() * max)
}

function randomItem(list) { return list[secureRandom(list.length)] }

function generateStrongPassword() {
  const selected = []
  while (selected.length < 4) {
    const word = randomItem(passwordWords)
    if (!selected.includes(word)) selected.push(word)
  }
  const number = String(secureRandom(9000) + 1000)
  const symbol = randomItem(passwordSymbols)
  return `${selected[0]}-${selected[1]}-${number}${symbol}-${selected[2]}-${selected[3]}`
}

function getPasswordStrength(password, email = '') {
  const value = String(password || '')
  const lower = value.toLowerCase()
  const lowerEmailName = String(email || '').split('@')[0]?.toLowerCase() || ''
  const checks = {
    length: value.length >= 16,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value),
    noEmail: !lowerEmailName || lowerEmailName.length < 3 || !lower.includes(lowerEmailName),
    noCommon: !weakPasswordWords.some(word => lower.includes(word)),
    noRepeat: !/(.)\1{2,}/.test(value),
    noSequence: !weakSequences.some(seq => lower.includes(seq))
  }
  let score = 0
  if (checks.length) score += 2
  if (checks.upper && checks.lower) score += 1
  if (checks.number) score += 1
  if (checks.special) score += 1
  if (checks.noEmail) score += 1
  if (checks.noCommon) score += 1
  if (checks.noRepeat && checks.noSequence) score += 1
  if (value.length >= 20 && score >= 7) score += 1
  score = Math.max(0, Math.min(8, score))
  const labels = ['Too weak', 'Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong', 'Excellent', 'Excellent']
  return { score, max: 8, percent: (score / 8) * 100, label: labels[score], checks }
}

function PasswordSuggestionDropdown({ password, email, suggestions, onUseSuggestion, onRefresh, t }) {
  const strength = getPasswordStrength(password, email)
  const currentSuggestion = suggestions[0] || generateStrongPassword()
  const compactRules = [['length', t('password_req_length', '16+ characters')], ['upper', t('password_req_upper_lower', 'Upper/lowercase')], ['number', t('password_req_number', 'Number')], ['special', t('password_req_special', 'Symbol')]]
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 40, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 12, boxShadow: '0 18px 45px var(--shadow)', overflow: 'hidden' }}>
      <button type="button" onMouseDown={event => { event.preventDefault(); onUseSuggestion(currentSuggestion) }} style={{ width: '100%', border: 0, background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', padding: '11px 12px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', textAlign: 'left' }}><span style={{ fontSize: 12, fontWeight: 900, wordBreak: 'break-word' }}>{currentSuggestion}</span><span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 900 }}>{t('password_suggested', 'Suggested')}</span></button>
      <div style={{ borderTop: '1px solid var(--border)', padding: '9px 12px', background: 'var(--bg-input)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 7 }}><strong style={{ fontSize: 11, color: 'var(--text-primary)' }}>{t('password_strength', 'Password strength')}</strong><span style={{ fontSize: 11, fontWeight: 950, color: strength.score >= 7 ? 'var(--green)' : strength.score >= 5 ? 'var(--accent)' : 'var(--red)' }}>{password ? strength.label : t('password_generated_ready', 'Generated ready')}</span></div>
        <div style={{ height: 6, borderRadius: 999, background: 'rgba(127,127,127,.18)', overflow: 'hidden', marginBottom: 8 }}><div style={{ width: `${password ? strength.percent : 100}%`, height: '100%', borderRadius: 999, background: password ? (strength.score >= 7 ? 'var(--green)' : strength.score >= 5 ? 'var(--accent)' : 'var(--red)') : 'var(--green)' }} /></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{compactRules.map(([key, label]) => <span key={key} style={{ fontSize: 10, color: !password || strength.checks[key] ? 'var(--green)' : 'var(--text-muted)', lineHeight: 1.2 }}>{!password || strength.checks[key] ? '✓' : '○'} {label}</span>)}</div><button type="button" onMouseDown={event => { event.preventDefault(); onRefresh() }} style={{ border: 0, background: 'transparent', color: 'var(--accent)', fontSize: 11, fontWeight: 950, cursor: 'pointer' }}>{t('refresh', 'Refresh')}</button></div>
      </div>
    </div>
  )
}

function PasswordField({ value, onChange, onEnter, onFocus, placeholder, showPassword, setShowPassword, mode, passwordHelpOpen, suggestions, onUseSuggestion, onRefresh, email, t }) {
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <input id={mode === 'signup' ? 'signup-password' : 'signin-password'} name={mode === 'signup' ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} onFocus={onFocus} onKeyDown={onEnter} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} autoCapitalize="none" autoCorrect="off" spellCheck="false" style={{ marginBottom: 0, paddingRight: 48 }} />
      <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 8, top: 7, width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</button>
      {mode === 'signup' && passwordHelpOpen && <PasswordSuggestionDropdown password={value} email={email} suggestions={suggestions} onUseSuggestion={onUseSuggestion} onRefresh={onRefresh} t={t} />}
    </div>
  )
}

export default function AuthModal({ initialMode = 'signin', onClose, initialError = '' }) {
  const { signIn, signUp, signInWithGoogle, signInWithMicrosoft, signInWithLinkedIn } = useAuth()
  const { t } = useLang()
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordHelpOpen, setPasswordHelpOpen] = useState(false)
  const [suggestions, setSuggestions] = useState(() => [generateStrongPassword(), generateStrongPassword(), generateStrongPassword()])
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password, email), [password, email])
  const signupPasswordStrongEnough = mode !== 'signup' || passwordStrength.score >= 7

  useEffect(() => { const handler = e => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' } }, [onClose])
  useEffect(() => { if (mode === 'signup') refreshSuggestions() }, [mode])
  const refreshSuggestions = () => setSuggestions([generateStrongPassword(), generateStrongPassword(), generateStrongPassword()])
  const switchMode = nextMode => { setMode(nextMode); setError(''); setSuccess(''); setPassword(''); setPasswordHelpOpen(false); setShowPassword(false); if (nextMode === 'signup') refreshSuggestions() }
  const requireLegalForSignup = () => { if (mode === 'signup' && !acceptedLegal) { setError(t('legal_required_signup')); return false } if (mode === 'signup' && !signupPasswordStrongEnough) { setPasswordHelpOpen(true); setError(t('password_too_weak', 'Please use a stronger password. Use at least 16 characters, include upper/lowercase letters, a number, a symbol, and avoid common words or sequences.')); return false } return true }
  const handleSubmit = async () => { setError(''); setSuccess(''); if (!requireLegalForSignup()) return; setLoading(true); try { if (mode === 'signin') { const { error } = await signIn(email, password); if (error) throw error } else { const { error } = await signUp(email, password, 'signup_email_checkbox'); if (error) throw error; setSuccess(t('account_created')) } } catch (e) { setError(e.message) } setLoading(false) }
  const requireLegalForOAuth = () => { if (mode === 'signup' && !acceptedLegal) { setError(t('legal_required_oauth')); return false } return true }
  const handleGoogle = async () => { setError(''); if (!requireLegalForOAuth()) return; try { const { error } = await signInWithGoogle(mode === 'signup' ? 'signup_google_checkbox' : 'signin_google'); if (error) setError(error.message) } catch (e) { setError(e?.message || 'Google sign-in failed. Please try again.') } }
  const handleMicrosoft = async () => { setError(''); if (!requireLegalForOAuth()) return; try { const { error } = await signInWithMicrosoft(mode === 'signup' ? 'signup_microsoft_checkbox' : 'signin_microsoft'); if (error) setError(error.message) } catch (e) { setError(e?.message || 'Microsoft sign-in failed. Please try again.') } }
  const handleLinkedIn = async e => { e.preventDefault(); setError(''); if (!requireLegalForOAuth()) return; try { const { error } = await signInWithLinkedIn(mode === 'signup' ? 'signup_linkedin_checkbox' : 'signin_linkedin'); if (error) setError(error.message) } catch (e) { setError(e?.message || 'LinkedIn sign-in failed. Please try again.') } }
  const useSuggestion = value => { setPassword(value); setShowPassword(true); setPasswordHelpOpen(false); setError('') }
  const createDisabled = loading || !email || !password || (mode === 'signup' && (!acceptedLegal || !signupPasswordStrongEnough))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 'clamp(24px,5vw,32px)', maxWidth: 460, width: '100%', position: 'relative', animation: 'fadeUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, padding: '4px 8px', lineHeight: 1 }}>×</button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}><div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Job<span style={{ color: 'var(--accent)' }}>lytics</span></div><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{mode === 'signin' ? (t('modal_welcome_back') || 'Welcome back') : (t('modal_join') || 'Create your account')}</p></div>
        <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, padding: 3, marginBottom: 20 }}>{[['signin', t('sign_in')], ['signup', t('sign_up')]].map(([m, label]) => <button key={m} type="button" onClick={() => switchMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#FFFDF8' : 'var(--text-secondary)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700 }}>{label}</button>)}</div>
        {mode === 'signup' && <div style={{ marginBottom: 14 }}><label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 13px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)', cursor: 'pointer' }}><input type="checkbox" checked={acceptedLegal} onChange={e => setAcceptedLegal(e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} /><span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{t('legal_signup_checkbox')}{' '}<a href="/terms" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 800 }}>{t('terms_of_use')}</a>{' · '}<a href="/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontWeight: 800 }}>{t('privacy_policy_full')}</a></span></label><p style={{ fontSize: 10, color: 'var(--text-hint)', marginTop: 7, lineHeight: 1.5 }}>{t('legal_signup_notice')}</p></div>}
        <button onClick={handleGoogle} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>{t('continue_google')}</button>
        <button type="button" onClick={handleMicrosoft} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><span style={{ width: 18, height: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2 }}><i style={{ background: '#f25022' }} /><i style={{ background: '#7fba00' }} /><i style={{ background: '#00a4ef' }} /><i style={{ background: '#ffb900' }} /></span>{t('continue_microsoft', 'Continue with Microsoft / Outlook')}</button>
        <button type="button" onClick={handleLinkedIn} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#0A66C2', border: '1px solid #0A66C2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, background: '#fff', color: '#0A66C2', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>in</span>{t('continue_linkedin', 'Continue with LinkedIn')}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}><div style={{ flex: 1, height: '1px', background: 'var(--border)' }} /><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('or')}</span><div style={{ flex: 1, height: '1px', background: 'var(--border)' }} /></div>
        <form autoComplete="on" onSubmit={event => { event.preventDefault(); handleSubmit() }}><input id={mode === 'signup' ? 'signup-email' : 'signin-email'} name="email" type="email" placeholder={t('email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 8 }} autoComplete="email" autoCapitalize="none" autoCorrect="off" /><div onFocus={() => mode === 'signup' && setPasswordHelpOpen(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPasswordHelpOpen(false) }}><PasswordField mode={mode} value={password} onFocus={() => mode === 'signup' && setPasswordHelpOpen(true)} onChange={e => setPassword(e.target.value)} onEnter={e => e.key === 'Enter' && handleSubmit()} placeholder={t('password_placeholder')} showPassword={showPassword} setShowPassword={setShowPassword} passwordHelpOpen={passwordHelpOpen} suggestions={suggestions} onUseSuggestion={useSuggestion} onRefresh={refreshSuggestions} email={email} t={t} /></div>{error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10, padding: '10px 12px', background: 'rgba(169,71,64,0.08)', borderRadius: 8 }}>{error}</p>}{success && <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 10, padding: '10px 12px', background: 'rgba(63,111,80,0.08)', borderRadius: 8 }}>{success}</p>}<button type="submit" disabled={createDisabled} className="btn-primary" style={{ width: '100%' }}>{loading ? t('please_wait') : mode === 'signin' ? t('sign_in_arrow') : t('create_account')}</button></form>
        {mode === 'signup' && password && !signupPasswordStrongEnough && <p style={{ fontSize: 11, color: 'var(--accent)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>{t('password_strength_needed', 'Use a very strong unique password. Click the password field to view secure suggestions.')}</p>}
        <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>{mode === 'signup' ? t('legal_signup_notice') : t('auth_terms')}{' '}<a href="/privacy" style={{ color: 'var(--text-secondary)' }}>{t('privacy_policy')}</a>.</p>
      </div>
    </div>
  )
}
