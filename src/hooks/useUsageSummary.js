import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getEffectiveClientPlanId, getMonthWindow, getPlanLimits, getResetLabel } from '../utils/planLimits'
import { useCvPersist } from './useCvPersist'

function iso(date) {
  return date.toISOString()
}

export function useUsageSummary() {
  const { user } = useAuth()
  const { cvFiles } = useCvPersist()
  const [loading, setLoading] = useState(true)
  const [analysisUsed, setAnalysisUsed] = useState(0)
  const [coverLetterUsed, setCoverLetterUsed] = useState(0)
  const [profilePlanId, setProfilePlanId] = useState('free')

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { start } = getMonthWindow()
        const startIso = iso(start)

        const [analysisResult, coverResult, profileResult] = await Promise.all([
          supabase
            .from('analyses')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startIso),
          supabase
            .from('api_usage')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('endpoint', 'cover-letter')
            .gte('created_at', startIso),
          supabase
            .from('user_profiles')
            .select('plan')
            .eq('user_id', user.id)
            .maybeSingle()
        ])

        if (cancelled) return

        setAnalysisUsed(analysisResult.count || 0)
        setCoverLetterUsed(coverResult.count || 0)
        setProfilePlanId(profileResult.data?.plan || 'free')
      } catch (error) {
        if (!cancelled) {
          console.warn('Usage summary failed:', error.message)
          setProfilePlanId('free')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  return useMemo(() => {
    const planId = getEffectiveClientPlanId(user, profilePlanId)
    const limits = getPlanLimits(planId)
    const unlimited = limits.id === 'admin'
    return {
      loading,
      planId: limits.id,
      planLabel: limits.label,
      isAdmin: limits.id === 'admin',
      resetLabel: getResetLabel(limits.id),
      unlimited,
      analysis: {
        used: analysisUsed,
        limit: limits.analysisLimit,
        remaining: unlimited ? Infinity : Math.max(0, limits.analysisLimit - analysisUsed)
      },
      coverLetters: {
        used: coverLetterUsed,
        limit: limits.coverLetterLimit,
        remaining: unlimited ? Infinity : Math.max(0, limits.coverLetterLimit - coverLetterUsed)
      },
      cvs: {
        used: cvFiles.length,
        limit: limits.cvLimit,
        remaining: unlimited ? Infinity : Math.max(0, limits.cvLimit - cvFiles.length)
      }
    }
  }, [loading, user, profilePlanId, analysisUsed, coverLetterUsed, cvFiles.length])
}
