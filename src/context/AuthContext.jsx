import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { legalAcceptancePayload } from '../lib/legal'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
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
      redirectTo: window.location.origin,
      data: legalAcceptancePayload(legalSource)
    }
  })

  const signInWithMicrosoft = (legalSource = 'signup_microsoft') => supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: window.location.origin,
      data: legalAcceptancePayload(legalSource)
    }
  })

  const signInWithLinkedIn = (legalSource = 'signup_linkedin') => supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
      redirectTo: window.location.origin,
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
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signInWithMicrosoft, signInWithLinkedIn, acceptCurrentTerms, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)