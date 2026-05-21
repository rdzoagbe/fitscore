import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { legalAcceptancePayload } from '../lib/legal'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncSession = async (forceRefresh = false) => {
    const result = forceRefresh ? await supabase.auth.refreshSession() : await supabase.auth.getSession()
    const nextSession = result?.data?.session ?? null
    setSession(nextSession)
    setUser(nextSession?.user ?? null)
    return nextSession
  }

  useEffect(() => {
    syncSession(false).finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
      setUser(session?.user ?? null)
    })

    const refreshTimer = window.setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        const expiresAt = data?.session?.expires_at ? data.session.expires_at * 1000 : 0
        const shouldRefresh = Boolean(data?.session?.refresh_token) && expiresAt && expiresAt - Date.now() < 5 * 60 * 1000
        if (shouldRefresh) syncSession(true).catch(() => {})
      })
    }, 60 * 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncSession(true).catch(() => {})
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      subscription.unsubscribe()
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const signUp = (email, password, legalSource = 'signup_email') => supabase.auth.signUp({
    email,
    password,
    options: { data: legalAcceptancePayload(legalSource) }
  })

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

  const signInWithGoogle = (legalSource = 'signup_google') => supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    data: legalAcceptancePayload(legalSource)
  }
})

const signInWithMicrosoft = (legalSource = 'signup_microsoft') => supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    data: legalAcceptancePayload(legalSource)
  }
})

const signInWithLinkedIn = (legalSource = 'signup_linkedin') => supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    data: legalAcceptancePayload(legalSource)
  }
})

  const acceptCurrentTerms = async (source = 'terms_gate') => {
    const { data, error } = await supabase.auth.updateUser({ data: legalAcceptancePayload(source) })
    if (!error && data?.user) setUser(data.user)
    return { data, error }
  }

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshSession: () => syncSession(true), signUp, signIn, signInWithGoogle, signInWithMicrosoft, signInWithLinkedIn, acceptCurrentTerms, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
