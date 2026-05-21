import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Keys that are user-specific and must be cleared when a different user signs in
const USER_SCOPED_LS_KEYS = [
  'fitscore_cv_',
  'fitscore_job_url_history',
  'joblytics_cover_letter_history_signal',
  'fitscore_onboarded',
  'fitscore_active_cv_version',
]

function clearUserScopedData() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && USER_SCOPED_LS_KEYS.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
  } catch (_) {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastUserIdRef = React.useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      lastUserIdRef.current = sessionUser?.id ?? null
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      const nextId = nextUser?.id ?? null

      // If a different user signed in, clear previous user's cached data
      if (lastUserIdRef.current && nextId && lastUserIdRef.current !== nextId) {
        clearUserScopedData()
      }
      // If signed out, clear data
      if (!nextUser && lastUserIdRef.current) {
        clearUserScopedData()
      }

      lastUserIdRef.current = nextId
      setUser(nextUser)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = (email, password) => supabase.auth.signUp({ email, password })
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })

  const signInWithMicrosoft = () => supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'email openid profile'
    }
  })

  const signInWithLinkedIn = () => supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signInWithMicrosoft, signInWithLinkedIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
