import { getUserPlan, isUnlimited, buildLimitPayload, getMonthStartIso } from './_planLimits.js'

export const USAGE_ACTIONS = {
  ANALYSIS: 'analysis',
  COVER_LETTER: 'cover_letter',
  LINKEDIN_OPTIMIZE: 'linkedin_optimize',
  CV_OPTIMIZE: 'cv_optimize'
}

function getLimitForAction(plan, action) {
  if (action === USAGE_ACTIONS.COVER_LETTER) return plan.coverLetterLimit
  if (action === USAGE_ACTIONS.CV_OPTIMIZE) return plan.cvLimit || plan.analysisLimit
  return plan.analysisLimit
}

async function safeCount(query, label = 'usage_count') {
  try {
    const { count, error } = await query
    if (error) {
      console.warn(`${label} failed:`, error.message)
      return { count: 0, available: false, error }
    }
    return { count: count || 0, available: true, error: null }
  } catch (error) {
    console.warn(`${label} crashed:`, error.message)
    return { count: 0, available: false, error }
  }
}

export async function getUsageGate(supabase, user, action) {
  const plan = await getUserPlan(supabase, user)
  const limit = getLimitForAction(plan, action)

  if (isUnlimited(plan)) {
    return {
      allowed: true,
      plan,
      used: 0,
      limit,
      remaining: Infinity,
      sources: { usage_events: 0, legacy: 0, usage_events_available: true, legacy_available: true },
      payload: null
    }
  }

  const monthStart = getMonthStartIso()

  const usageEvents = await safeCount(
    supabase
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', action)
      .eq('status', 'success')
      .gte('created_at', monthStart),
    'usage_events count'
  )

  let legacy = { count: 0, available: false, error: null }

  if (action === USAGE_ACTIONS.ANALYSIS) {
    legacy = await safeCount(
      supabase
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart),
      'legacy analyses count'
    )
  }

  if (action === USAGE_ACTIONS.COVER_LETTER) {
    legacy = await safeCount(
      supabase
        .from('api_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('endpoint', 'cover-letter')
        .gte('created_at', monthStart),
      'legacy cover-letter count'
    )
  }

  const used = Math.max(usageEvents.count, legacy.count)
  const remaining = Math.max(0, limit - used)
  const allowed = used < limit

  return {
    allowed,
    plan,
    used,
    limit,
    remaining,
    sources: {
      usage_events: usageEvents.count,
      legacy: legacy.count,
      usage_events_available: usageEvents.available,
      legacy_available: legacy.available
    },
    payload: allowed ? null : buildLimitPayload({ action, plan, used, limit })
  }
}

export function buildUsageResponse(usageGate, increment = 0) {
  const used = Number(usageGate?.used || 0) + Number(increment || 0)
  const limit = usageGate?.limit ?? 0
  const unlimited = limit >= 9999 || usageGate?.plan?.id === 'admin'

  return {
    action: null,
    planId: usageGate?.plan?.id || 'free',
    planLabel: usageGate?.plan?.label || 'Free',
    used,
    limit,
    remaining: unlimited ? Infinity : Math.max(0, limit - used),
    sources: usageGate?.sources || {}
  }
}

export async function recordUsageEvent(supabase, user, action, metadata = {}) {
  try {
    const { error } = await supabase
      .from('usage_events')
      .insert({
        user_id: user.id,
        action,
        status: 'success',
        metadata: metadata || {}
      })

    if (error) {
      console.warn('Usage event insert failed:', error.message)
      return false
    }

    return true
  } catch (error) {
    console.warn('Usage event insert crashed:', error.message)
    return false
  }
}
