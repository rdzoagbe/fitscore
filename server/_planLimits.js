export const SERVER_PLAN_LIMITS = {
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

export function normalizeServerPlanId(value) {
  return SERVER_PLAN_LIMITS[value] ? value : 'free'
}

export function getServerPlanLimits(planId = 'free') {
  return SERVER_PLAN_LIMITS[normalizeServerPlanId(planId)]
}

export function getServerAdminIdentifiers() {
  const emails = (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
  const ids = (process.env.ADMIN_USER_IDS || process.env.VITE_ADMIN_USER_IDS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
  return { emails, ids }
}

export function isServerAdmin(user) {
  if (!user) return false
  const { emails, ids } = getServerAdminIdentifiers()
  return Boolean(
    (user.id && ids.includes(user.id)) ||
    (user.email && emails.includes(user.email.toLowerCase()))
  )
}

export async function getUserPlan(supabase, user) {
  if (isServerAdmin(user)) return getServerPlanLimits('admin')

  const { data, error } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.warn('Plan lookup failed:', error.message)
    return getServerPlanLimits('free')
  }

  return getServerPlanLimits(data?.plan || 'free')
}

export function getMonthStartIso(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export function buildLimitPayload({ action, plan, used, limit }) {
  return {
    error: `You have reached your ${plan.label} ${action} limit (${used}/${limit}).`,
    rate_limited: true,
    reason: `${action}_limit`,
    usage: {
      action,
      planId: plan.id,
      planLabel: plan.label,
      used,
      limit,
      remaining: Math.max(0, limit - used)
    }
  }
}

export function isUnlimited(plan) {
  return plan?.id === 'admin' || plan?.analysisLimit >= 9999 || plan?.coverLetterLimit >= 9999
}
