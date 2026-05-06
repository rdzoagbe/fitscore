import { useEffect, useMemo, useState } from 'react'
import { getDailyChallenge } from '../data/dailyChallenges'
import { getTodayKey, getWeekKey, safeJsonParse } from '../utils/progressUtils'

const STORAGE_KEY = 'joblytics_challenge_progress'

function defaultProgress() {
  return {
    completedDates: [],
    completedChallengeIds: [],
    streak: 0,
    bestStreak: 0,
    weeklyCompleted: 0,
    weekKey: getWeekKey()
  }
}

function calculateStreak(completedDates) {
  if (!completedDates?.length) return 0

  const set = new Set(completedDates)
  let streak = 0
  const cursor = new Date()

  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function useDailyChallenge() {
  const todayKey = getTodayKey()
  const weekKey = getWeekKey()
  const challenge = useMemo(() => getDailyChallenge(), [])

  const [progress, setProgress] = useState(() => {
    if (typeof window === 'undefined') return defaultProgress()

    const stored = safeJsonParse(window.localStorage.getItem(STORAGE_KEY), defaultProgress())

    if (stored.weekKey !== weekKey) {
      return {
        ...stored,
        weeklyCompleted: 0,
        weekKey
      }
    }

    return stored
  })

  const completedToday = progress.completedDates.includes(todayKey)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  function completeChallenge() {
    setProgress(current => {
      const alreadyCompletedToday = current.completedDates.includes(todayKey)

      const completedDates = alreadyCompletedToday
        ? current.completedDates
        : [...current.completedDates, todayKey]

      const completedChallengeIds = current.completedChallengeIds.includes(challenge.id)
        ? current.completedChallengeIds
        : [...current.completedChallengeIds, challenge.id]

      const streak = calculateStreak(completedDates)

      return {
        ...current,
        completedDates,
        completedChallengeIds,
        streak,
        bestStreak: Math.max(current.bestStreak || 0, streak),
        weeklyCompleted: alreadyCompletedToday
          ? current.weeklyCompleted
          : Math.min((current.weeklyCompleted || 0) + 1, 5),
        weekKey
      }
    })
  }

  return {
    challenge,
    progress,
    completedToday,
    completeChallenge
  }
}
