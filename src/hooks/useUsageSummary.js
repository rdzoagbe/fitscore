import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getEffectiveClientPlanId, getMonthWindow, getPlanLimits, getResetLabel } from '../utils/planLimits'
import { useCvPersist } from './useCvPersist'

function iso(date) {
  return date.toISOString()
}

async function safeCount(query) {
  try {
    const { count, error } = await query
    if (error) return { count: 0, available: false, error }
    return { count: count || 0, available: true, error: null }
  } catch (error) {
    return { count: 0, available: false, error }
  }
}

export function useUsageSummary() {
  const { user } = useAuth()
  const { cvFiles } = useCvPersist()
  const [loading, setLoading] = useState(true)
  const [analysisUsed, setAnalysisUsed] = useState(0)
  const [coverLetterUsed, setCoverLetterUsed] = useState(0)
  const [profilePlanId, setProfilePlanId] = useState('free')
  const [sources, setSources] = useState({})

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

        const [analysisEvents, analysisLegacy, coverEvents, coverLegacy, profileResult] = await Promise.all([
          safeCount(
            supabase
              .from('usage_events')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('action', 'analysis')
              .eq('status', 'success')
              .gte('created_at', startIso)
          ),
          safeCount(
            supabase
              .from('analyses')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .gte('created_at', startIso)
          ),
          safeCount(
            supabase
              .from('usage_events')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('action', 'cover_letter')
              .eq('status', 'success')
              .gte('created_at', startIso)
          ),
          safeCount(
            supabase
              .from('api_usage')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('endpoint', 'cover-letter')
              .gte('created_at', startIso)
          ),
          supabase
            .from('user_profiles')
            .select('plan')
            .eq('user_id', user.id)
            .maybeSingle()
        ])

        if (cancelled) return

        setAnalysisUsed(Math.max(analysisEvents.count, analysisLegacy.count))
        setCoverLetterUsed(Math.max(coverEvents.count, coverLegacy.count))
        setProfilePlanId(profileResult.data?.plan || 'free')
        setSources({
          analysis: { usage_events: analysisEvents.count, legacy: analysisLegacy.count, usage_events_available: analysisEvents.available, legacy_available: analysisLegacy.available },
          coverLetters: { usage_events: coverEvents.count, legacy: coverLegacy.count, usage_events_available: coverEvents.available, legacy_available: coverLegacy.available }
        })
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
      sources,
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
  }, [loading, user, profilePlanId, analysisUsed, coverLetterUsed, cvFiles.length, sources])
}
