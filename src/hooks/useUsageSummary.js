import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getMonthWindow, getPlanLimits, getResetLabel } from '../utils/planLimits'
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
  const [planId, setPlanId] = useState('free')

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
        setPlanId(profileResult.data?.plan || 'free')
      } catch (error) {
        if (!cancelled) {
          console.warn('Usage summary failed:', error.message)
          setPlanId('free')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  return useMemo(() => {
    const limits = getPlanLimits(planId)
    return {
      loading,
      planId: limits.id,
      planLabel: limits.label,
      resetLabel: getResetLabel(limits.id),
      analysis: {
        used: analysisUsed,
        limit: limits.analysisLimit,
        remaining: Math.max(0, limits.analysisLimit - analysisUsed)
      },
      coverLetters: {
        used: coverLetterUsed,
        limit: limits.coverLetterLimit,
        remaining: Math.max(0, limits.coverLetterLimit - coverLetterUsed)
      },
      cvs: {
        used: cvFiles.length,
        limit: limits.cvLimit,
        remaining: Math.max(0, limits.cvLimit - cvFiles.length)
      }
    }
  }, [loading, planId, analysisUsed, coverLetterUsed, cvFiles.length])
}
