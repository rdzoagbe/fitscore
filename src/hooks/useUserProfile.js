import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LS_KEY = 'fitscore_profile_v1'

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // Fetch from Supabase on mount and sync to localStorage
  useEffect(() => {
    if (!user) { setLoading(false); return }
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        if (data) {
          setProfile(data)
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        }
      } catch (e) {
        console.warn('Profile fetch error:', e.message)
      }
      setLoading(false)
    })()
  }, [user])

  const saveFullName = useCallback(async (fullName) => {
    if (!user) return { error: 'Not signed in' }
    const trimmed = (fullName || '').trim()
    if (!trimmed) return { error: 'Name required' }
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, full_name: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
      const newProfile = { full_name: trimmed }
      setProfile(newProfile)
      localStorage.setItem(LS_KEY, JSON.stringify(newProfile))
      return { success: true }
    } catch (e) {
      return { error: e.message }
    }
  }, [user])

  return { profile, fullName: profile?.full_name || '', loading, saveFullName }
}
