'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { signInAction, signInWithGoogleAction, signUpAction, type AuthActionState } from './actions'

const initialState: AuthActionState = {}

function SubmitButton({ mode }: { readonly mode: 'signin' | 'signup' }): JSX.Element {
  const { pending } = useFormStatus()
  return <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
}

function GoogleButton(): JSX.Element {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="rounded-md border border-border bg-elevated px-4 py-3 text-sm text-[var(--text-primary)] transition hover:border-[var(--border-strong)] disabled:opacity-60">
      {pending ? 'Opening Google…' : 'Continue with Google'}
    </button>
  )
}

export function LoginForm(): JSX.Element {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const urlError = searchParams.get('error')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const action = mode === 'signin' ? signInAction : signUpAction
  const [state, formAction] = useFormState(action, initialState)

  return (
    <div className="grid gap-4">
      <form action={signInWithGoogleAction} className="grid gap-3">
        <input type="hidden" name="next" value={next} />
        <GoogleButton />
      </form>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <span className="h-px flex-1 bg-border" />
        Email access
        <span className="h-px flex-1 bg-border" />
      </div>
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
        {urlError ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{urlError}</p> : null}
        {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
        {state.message ? <p className="rounded-md border border-emerald/20 bg-emerald/10 p-3 text-xs text-emerald">{state.message}</p> : null}
        <SubmitButton mode={mode} />
        <button type="button" className="text-left text-xs text-accent" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
