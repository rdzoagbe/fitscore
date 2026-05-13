'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { signInAction, signUpAction, type AuthActionState } from './actions'

const initialState: AuthActionState = {}

export function LoginForm(): JSX.Element {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const action = mode === 'signin' ? signInAction : signUpAction
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      {mode === 'signup' ? (
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
          Full name
          <input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" name="fullName" type="text" placeholder="Roland Dzoagbe" />
        </label>
      ) : null}
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
        Email
        <input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
        Password
        <input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={8} placeholder="••••••••" />
      </label>
      {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
      {state.message ? <p className="rounded-md border border-emerald/20 bg-emerald/10 p-3 text-xs text-emerald">{state.message}</p> : null}
      <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
      <button type="button" className="text-left text-xs text-accent" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}
