import { buildLimitPayload, getMonthStartIso, getUserPlan, isUnlimited } from './_planLimits.js'

export const USAGE_ACTIONS = {
  ANALYSIS: 'analysis',
  COVER_LETTER: 'cover_letter'
}

function legacyEndpointForAction(action) {
  if (action === USAGE_ACTIONS.COVER_LETTER) return 'cover-letter'
  return action
}

function limitForAction(plan, action) {
  if (action === USAGE_ACTIONS.COVER_LETTER) return plan.coverLetterLimit
  if (action === USAGE_ACTIONS.ANALYSIS) return plan.analysisLimit
  return 0
}

function labelForAction(action) {
  if (action === USAGE_ACTIONS.COVER_LETTER) return 'cover letter'
  if (action === USAGE_ACTIONS.ANALYSIS) return 'analysis'
  return action
}

async function safeCount(queryBuilder) {
  try {
    const { count, error } = await queryBuilder
    if (error) return { count: 0, error }
    return { count: count || 0, error: null }
  } catch (error) {
    return { count: 0, error }
  }
}

export async function countUsageForAction(supabase, userId, action, sinceIso = getMonthStartIso()) {
  const usageEvents = await safeCount(
    supabase
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .eq('status', 'success')
      .gte('created_at', sinceIso)
  )

  let legacy = { count: 0, error: null }

  if (action === USAGE_ACTIONS.ANALYSIS) {
    legacy = await safeCount(
      supabase
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', sinceIso)
    )
  }

  if (action === USAGE_ACTIONS.COVER_LETTER) {
    legacy = await safeCount(
      supabase
        .from('api_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('endpoint', legacyEndpointForAction(action))
        .gte('created_at', sinceIso)
    )
  }

  return {
    used: Math.max(usageEvents.count, legacy.count),
    sources: {
      usage_events: usageEvents.count,
      legacy: legacy.count,
      usage_events_available: !usageEvents.error,
      legacy_available: !legacy.error
    }
  }
}

export async function getUsageGate(supabase, user, action) {
  const plan = await getUserPlan(supabase, user)
  const sinceIso = getMonthStartIso()
  const { used, sources } = await countUsageForAction(supabase, user.id, action, sinceIso)
  const limit = limitForAction(plan, action)

  if (!isUnlimited(plan) && used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      plan,
      action,
      sources,
      payload: buildLimitPayload({ action: labelForAction(action), plan, used, limit })
    }
  }

  return { allowed: true, used, limit, plan, action, sources }
}

export async function recordUsageEvent(supabase, user, action, metadata = {}) {
  const payload = {
    user_id: user.id,
    action,
    status: 'success',
    metadata
  }

  const { error: usageEventError } = await supabase.from('usage_events').insert(payload)

  // Backward compatibility for the current dashboard until usage_events is deployed everywhere.
  if (action === USAGE_ACTIONS.COVER_LETTER) {
    const { error: legacyError } = await supabase
      .from('api_usage')
      .insert({ user_id: user.id, endpoint: legacyEndpointForAction(action) })
    if (usageEventError && legacyError) throw legacyError
  } else if (usageEventError) {
    // Analysis legacy usage is represented by the saved analyses row, so do not fail if usage_events is missing.
    console.warn('usage_events insert skipped:', usageEventError.message)
  }

  return { recorded: !usageEventError, error: usageEventError || null }
}

export function buildUsageResponse(gate, increment = 0) {
  const used = gate.used + increment
  const limit = gate.limit
  return {
    action: labelForAction(gate.action),
    planId: gate.plan.id,
    planLabel: gate.plan.label,
    used,
    limit,
    remaining: isUnlimited(gate.plan) ? 9999 : Math.max(0, limit - used),
    sources: gate.sources
  }
}
