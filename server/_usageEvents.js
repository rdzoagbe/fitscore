import { getUserPlan, isUnlimited, buildLimitPayload, getMonthStartIso } from './_planLimits.js'

export const USAGE_ACTIONS = {
  ANALYSIS: 'analysis',
  COVER_LETTER: 'cover_letter',
  LINKEDIN_OPTIMIZE: 'linkedin_optimize',
  CV_OPTIMIZE: 'cv_optimize'
}

function getLimitForAction(plan, action) {
  if (action === USAGE_ACTIONS.COVER_LETTER) return plan.coverLetterLimit
  if (action === USAGE_ACTIONS.ANALYSIS) return plan.analysisLimit
  return plan.analysisLimit
}

async function safeCount(query) {
  try {
    const { count, error } = await query

    if (error) {
      console.warn('Usage count failed:', error.message)
      return { count: 0, available: false, error }
    }

    return { count: count || 0, available: true, error: null }
  } catch (error) {
    console.warn('Usage count crashed:', error.message)
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
      sources: {
        usage_events: 0,
        legacy: 0
      },
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
      .gte('created_at', monthStart)
  )

  let legacy = { count: 0, available: false }

  if (action === USAGE_ACTIONS.ANALYSIS) {
    legacy = await safeCount(
      supabase
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', monthStart)
    )
  }

  if (action === USAGE_ACTIONS.COVER_LETTER) {
    legacy = await safeCount(
      supabase
        .from('api_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('endpoint', 'cover-letter')
        .gte('created_at', monthStart)
    )
  }

  const used = Math.max(usageEvents.count, legacy.count)
  const allowed = used < limit

  return {
    allowed,
    plan,
    used,
    limit,
    sources: {
      usage_events: usageEvents.count,
      legacy: legacy.count,
      usage_events_available: usageEvents.available,
      legacy_available: legacy.available
    },
    payload: allowed ? null : buildLimitPayload({ action, plan, used, limit })
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
        metadata
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
