export function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function getWeekKey(date = new Date()) {
  const firstDay = new Date(date)
  const day = firstDay.getDay() || 7
  firstDay.setDate(firstDay.getDate() - day + 1)
  return firstDay.toISOString().slice(0, 10)
}

export function getStoredAnalyses() {
  if (typeof window === 'undefined') return []

  const keys = [
    'joblytics_history',
    'fitscore_history',
    'analysis_history',
    'joblytics_analyses'
  ]

  for (const key of keys) {
    const value = safeJsonParse(window.localStorage.getItem(key), null)
    if (Array.isArray(value)) return value
  }

  return []
}

export function extractScore(item) {
  const candidates = [
    item?.score,
    item?.atsScore,
    item?.overallScore,
    item?.matchScore,
    item?.display_score,
    item?.result?.score,
    item?.result?.atsScore,
    item?.result?.display_score,
    item?.analysis?.score
  ]

  const found = candidates.find(value => Number.isFinite(Number(value)))
  return found == null ? null : Math.round(Number(found))
}

export function calculateAnalysisMetrics(analyses = []) {
  const scores = analyses.map(extractScore).filter(score => Number.isFinite(score))

  return {
    analysesCount: analyses.length,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0
  }
}

export function getUserDisplayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')?.[0] ||
    'there'
  )
}
