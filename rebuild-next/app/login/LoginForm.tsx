'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type LoginMode = 'signin' | 'signup'

interface LoginFormProps {
  readonly nextPath: string
  readonly initialError?: string
  readonly loggedOut?: boolean
}

function cleanNextPath(value: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export function LoginForm({ nextPath, initialError, loggedOut = false }: LoginFormProps): JSX.Element {
  const router = useRouter()
  const next = useMemo(() => cleanNextPath(nextPath), [nextPath])
  const [mode, setMode] = useState<LoginMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [info, setInfo] = useState<string | null>(loggedOut ? 'You have been signed out. You can sign back in below.' : null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    try {
      const supabase = createClient()
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (!active) return
          if (session) router.replace(next)
          else setReady(true)
        })
        .catch(authError => {
          if (!active) return
          setError(authError instanceof Error ? authError.message : 'Authentication could not be initialized.')
          setReady(true)
        })
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : 'Authentication could not be initialized.')
      setReady(true)
    }

    return () => { active = false }
  }, [next, router])

  function resetMessages(): void {
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.replace(next)
        router.refresh()
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { full_name: fullName.trim() || null }
        }
      })

      if (signUpError) throw signUpError
      if (data.session) {
        router.replace(next)
        router.refresh()
        return
      }

      setInfo('Account created. Check your email to confirm your account, then sign in.')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle(): Promise<void> {
    resetMessages()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
      })
      if (googleError) throw googleError
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google sign-in could not be started.')
      setLoading(false)
    }
  }

  async function handleMagicLink(): Promise<void> {
    resetMessages()
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` }
      })
      if (magicError) throw magicError
      setInfo('Magic link sent — check your inbox.')
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Magic link could not be sent.')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-8">
        <div className="mb-6 h-8 w-32 animate-pulse rounded bg-white/5" />
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded bg-white/5" />
          <div className="h-10 animate-pulse rounded bg-white/5" />
          <div className="h-10 animate-pulse rounded bg-sky-400/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-8 shadow-2xl shadow-black/20">
      <div className="mb-6 flex rounded-lg bg-[#263148] p-1">
        <button type="button" onClick={() => { setMode('signin'); resetMessages() }} className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-[#1e293b] text-slate-200 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Sign in</button>
        <button type="button" onClick={() => { setMode('signup'); resetMessages() }} className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-[#1e293b] text-slate-200 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Create account</button>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</div> : null}
      {info ? <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">{info}</div> : null}

      <button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#263148] py-2.5 text-sm text-slate-200 transition hover:bg-[#2d3a55] disabled:opacity-50">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-slate-600">or</span><div className="h-px flex-1 bg-white/10" /></div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' ? (
          <label className="block text-[10px] uppercase tracking-wider text-slate-400">Full name
            <input type="text" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Roland Dzoagbe" className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#1a2540] px-3 py-2.5 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-sky-400/50" />
          </label>
        ) : null}
        <label className="block text-[10px] uppercase tracking-wider text-slate-400">Email
          <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#1a2540] px-3 py-2.5 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-sky-400/50" />
        </label>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400">Password
          <input type="password" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" minLength={8} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#1a2540] px-3 py-2.5 text-sm normal-case tracking-normal text-slate-200 outline-none focus:border-sky-400/50" />
        </label>
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-sky-400 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-sky-300 disabled:opacity-60">{loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>

      {mode === 'signin' ? <button type="button" onClick={handleMagicLink} disabled={loading} className="mt-3 w-full py-2 text-xs text-slate-400 transition hover:text-slate-200">Send me a magic link instead</button> : null}
      <p className="mt-6 text-center text-xs text-slate-500"><Link href="/" className="text-sky-400 hover:underline">← Back home</Link></p>
    </div>
  )
}
