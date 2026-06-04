import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { legalAcceptancePayload } from '../lib/legal'
import { clearPreviousUserBrowserData, getNormalizedUserMetadata, getUserEmail, getUserDisplayName } from '../lib/userProfile'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const normalizeSignedInUserInBackground = signedInUser => {
    if (!signedInUser?.id) return

    try {
      clearPreviousUserBrowserData(signedInUser.id)
    } catch (error) {
      console.warn('User browser data isolation failed:', error)
    }

    const metadata = signedInUser.user_metadata || {}
    const displayName = getUserDisplayName(signedInUser)
    const email = getUserEmail(signedInUser)

    const alreadyNormalized =
      metadata.profile_normalized_at &&
      metadata.full_name &&
      (metadata.email || signedInUser.email)

    if (alreadyNormalized) return

    supabase.auth.updateUser({
      data: {
        ...metadata,
        ...getNormalizedUserMetadata(signedInUser, 'auth_background_normalize'),
        full_name: displayName,
        name: displayName,
        email
      }
    })
      .then(({ data, error }) => {
        if (!error && data?.user) setUser(data.user)
      })
      .catch(error => {
        console.warn('OAuth profile normalization failed:', error)
      })
  }

  const syncSession = async (forceRefresh = false) => {
    const result = forceRefresh
      ? await supabase.auth.refreshSession()
      : await supabase.auth.getSession()

    const nextSession = result?.data?.session ?? null
    const nextUser = nextSession?.user ?? null

    setSession(nextSession)
    setUser(nextUser)

    if (nextUser) normalizeSignedInUserInBackground(nextUser)

    return nextSession
  }

  useEffect(() => {
    let mounted = true

    syncSession(false)
      .catch(error => {
        console.warn('Initial auth session load failed:', error)
        if (mounted) {
          setSession(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUser = nextSession?.user ?? null
      setSession(nextSession ?? null)
      setUser(nextUser)
      if (nextUser) normalizeSignedInUserInBackground(nextUser)
    })

    const refreshTimer = window.setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        const expiresAt = data?.session?.expires_at ? data.session.expires_at * 1000 : 0
        const shouldRefresh =
          Boolean(data?.session?.refresh_token) &&
          expiresAt &&
          expiresAt - Date.now() < 5 * 60 * 1000

        if (shouldRefresh) syncSession(true).catch(() => {})
      })
    }, 60 * 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncSession(false).catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
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

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (!result.error && result.data?.session) {
      setSession(result.data.session)
      setUser(result.data.user)
      if (result.data.user) normalizeSignedInUserInBackground(result.data.user)
    }
    return result
  }

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
      scopes: 'openid email profile User.Read',
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
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      refreshSession: () => syncSession(true),
      signUp,
      signIn,
      signInWithGoogle,
      signInWithMicrosoft,
      signInWithLinkedIn,
      acceptCurrentTerms,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
