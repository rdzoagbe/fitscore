import { useEffect, useMemo, useState } from 'react'
import { calculateAnalysisMetrics, getStoredAnalyses } from '../utils/progressUtils'

export function useProgressMetrics(challengeProgress = {}) {
  const [analyses, setAnalyses] = useState([])

  useEffect(() => {
    setAnalyses(getStoredAnalyses())

    function handleStorage() {
      setAnalyses(getStoredAnalyses())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

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
