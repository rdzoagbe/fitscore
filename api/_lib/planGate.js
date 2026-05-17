import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const PLAN_LIMITS = {
  free: {
    id: 'free',
    label: 'Free',
    monthly: { ats_analysis: 3, profile_optimize: 1 },
    features: { cv_rebuilder: false, exports: false, history: true }
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    monthly: { ats_analysis: 40, profile_optimize: 10 },
    features: { cv_rebuilder: true, exports: true, history: true }
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthly: { ats_analysis: 200, profile_optimize: 60 },
    features: { cv_rebuilder: true, exports: true, history: true }
  }
}

export function createAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

export async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token || !supabase) {
    const err = new Error('Please sign in to use this feature.')
    err.statusCode = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Your session expired. Please sign in again.')
    err.statusCode = 401
    err.code = 'INVALID_SESSION'
    throw err
  }
  return data.user
}

export function normalizePlan(value) {
  const plan = String(value || '').toLowerCase().trim()
  if (['pro', 'premium', 'professional'].includes(plan)) return 'pro'
  if (['starter', 'tier', 'plus', 'basic', 'paid'].includes(plan)) return 'starter'
  return 'free'
}

export function resolveUserPlan(user) {
  const adminIds = (process.env.RATE_LIMIT_WHITELIST || process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean)
  if (adminIds.includes(user?.id)) return PLAN_LIMITS.pro

  const meta = { ...(user?.user_metadata || {}), ...(user?.app_metadata || {}) }
  const status = String(meta.subscription_status || meta.stripe_subscription_status || '').toLowerCase()
  const rawPlan = meta.subscription_plan || meta.plan || meta.price_plan || meta.product_plan || meta.tier
  const planId = normalizePlan(rawPlan)

  if (planId !== 'free') {
    if (!status || ['active', 'trialing', 'paid'].includes(status)) return PLAN_LIMITS[planId]
  }
  return PLAN_LIMITS.free
}

function startOfMonthIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
}

function hash(value) {
  if (!value) return null
  const salt = process.env.USAGE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'joblytics'
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex')
}

export function getRequestIdentity(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
  const ip = String(forwarded).split(',')[0].trim()
  const userAgent = req.headers['user-agent'] || ''
  const deviceId = String(req.headers['x-joblytics-device-id'] || '').slice(0, 120)
  return { deviceId, ipHash: hash(ip), userAgentHash: hash(userAgent) }
}

async function countUsageEvents(supabase, user, eventType, identity) {
  const since = startOfMonthIso()
  const filters = [`user_id.eq.${user.id}`]
  if (identity.deviceId) filters.push(`device_id.eq.${identity.deviceId}`)
  if (identity.ipHash) filters.push(`ip_hash.eq.${identity.ipHash}`)

  const { count, error } = await supabase
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', eventType)
    .gte('created_at', since)
    .or(filters.join(','))

  if (error) throw error
  return count || 0
}

async function countLegacyAnalyses(supabase, user) {
  const since = startOfMonthIso()
  const { count } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)
  return count || 0
}

export async function checkUsageLimit({ supabase, req, user, eventType }) {
  const plan = resolveUserPlan(user)
  const limit = plan.monthly[eventType] ?? 0
  const identity = getRequestIdentity(req)
  let used = 0
  let source = 'usage_events'

  try {
    used = await countUsageEvents(supabase, user, eventType, identity)
  } catch (error) {
    source = 'legacy'
    if (eventType === 'ats_analysis') used = await countLegacyAnalyses(supabase, user)
    else used = 0
  }

  const remaining = Math.max(0, limit - used)
  if (used >= limit) {
    const err = new Error(`${plan.label} limit reached: ${limit} ${eventType.replace('_', ' ')} per month. Upgrade to continue.`)
    err.statusCode = 429
    err.code = 'PLAN_LIMIT_REACHED'
    err.usage = { plan: plan.id, planLabel: plan.label, eventType, used, limit, remaining: 0, source }
    throw err
  }

  return { plan: plan.id, planLabel: plan.label, eventType, used, limit, remaining, source, identity }
}

export async function recordUsageEvent({ supabase, user, eventType, usage, meta = {} }) {
  if (!supabase || !user || !usage) return null
  try {
    const { data, error } = await supabase
      .from('usage_events')
      .insert({
        user_id: user.id,
        email: user.email || null,
        event_type: eventType,
        plan: usage.plan,
        device_id: usage.identity?.deviceId || null,
        ip_hash: usage.identity?.ipHash || null,
        user_agent_hash: usage.identity?.userAgentHash || null,
        metadata: meta
      })
      .select()
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export function publicUsage(usage, increment = 0) {
  if (!usage) return null
  const used = usage.used + increment
  return {
    plan: usage.plan,
    planLabel: usage.planLabel,
    eventType: usage.eventType,
    used,
    limit: usage.limit,
    remaining: Math.max(0, usage.limit - used),
    source: usage.source
  }
}
