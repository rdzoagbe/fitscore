export const PLAN_LIMITS = {
  free: {
    id: 'free',
    label: 'Free',
    analysisLimit: 5,
    coverLetterLimit: 3,
    cvLimit: 2,
    resetType: 'monthly'
  },
  job_search_pass: {
    id: 'job_search_pass',
    label: 'Job Search Pass',
    analysisLimit: 100,
    coverLetterLimit: 30,
    cvLimit: 10,
    resetType: 'pass'
  },
  pro_monthly: {
    id: 'pro_monthly',
    label: 'Pro Monthly',
    analysisLimit: 150,
    coverLetterLimit: 60,
    cvLimit: 20,
    resetType: 'monthly'
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    analysisLimit: 9999,
    coverLetterLimit: 9999,
    cvLimit: 9999,
    resetType: 'none'
  }
}

export const DEFAULT_PLAN_ID = 'free'

export function normalizePlanId(value) {
  return PLAN_LIMITS[value] ? value : DEFAULT_PLAN_ID
}

export function getPlanLimits(planId = DEFAULT_PLAN_ID) {
  return PLAN_LIMITS[normalizePlanId(planId)]
}

export function getMonthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export function getResetLabel(planId = DEFAULT_PLAN_ID) {
  const plan = getPlanLimits(planId)
  if (plan.resetType === 'none') return 'No reset needed'
  if (plan.resetType === 'pass') return 'During active pass'
  const { end } = getMonthWindow()
  return `Resets ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export function getUsagePercent(used = 0, limit = 0) {
  if (!limit || limit >= 9999) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

export function isLimitReached(used = 0, limit = 0) {
  return Boolean(limit && limit < 9999 && used >= limit)
}
