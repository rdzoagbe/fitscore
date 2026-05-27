import { useEffect, useMemo, useState } from 'react'
import { calculateAnalysisMetrics, getStoredAnalyses } from '../utils/progressUtils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useProgressMetrics(challengeProgress = {}) {
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState([])

  useEffect(() => {
    if (user) {
      supabase
        .from('analyses')
        .select('id, score, job_title, job_url, result, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80)
        .then(({ data }) => setAnalyses(data || []))
    } else {
      setAnalyses(getStoredAnalyses())

      function handleStorage() {
        setAnalyses(getStoredAnalyses())
      }

      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    }
  }, [user])

  return useMemo(() => {
    const analysisMetrics = calculateAnalysisMetrics(analyses)

    return {
      ...analysisMetrics,
      currentStreak: challengeProgress.streak || 0,
      bestStreak: challengeProgress.bestStreak || 0,
      weeklyCompleted: challengeProgress.weeklyCompleted || 0,
      weeklyTarget: 5,
      analyses
    }
  }, [analyses, challengeProgress])
}
