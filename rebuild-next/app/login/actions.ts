'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthActionState = {
  readonly error?: string
  readonly message?: string
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getNextPath(formData: FormData): string {
  const next = getString(formData, 'next')
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

export async function signInAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getString(formData, 'email')
  const password = getString(formData, 'password')
  const next = getNextPath(formData)

  if (!email || !password) return { error: 'Email and password are required.' }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect(next)
}

export async function signUpAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getString(formData, 'email')
  const password = getString(formData, 'password')
  const fullName = getString(formData, 'fullName')
  const next = getNextPath(formData)

  if (!email || !password) return { error: 'Email and password are required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: fullName || null }
    }
  })

  if (error) return { error: error.message }

  if (data.session) redirect(next)

  return { message: 'Account created. Check your email to confirm your account, then sign in.' }
}
