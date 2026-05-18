import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLAN_LIMITS = {
  free: { id: 'free', label: 'Free', monthly: { profile_optimize: 1 } },
  starter: { id: 'starter', label: 'Starter', monthly: { profile_optimize: 10 } },
  pro: { id: 'pro', label: 'Pro', monthly: { profile_optimize: 60 } }
}

const SYSTEM = `You are a senior LinkedIn profile strategist and technical recruiter.
Your job is to improve a user's LinkedIn profile for their target role using ONLY the profile text provided by the user.
Do not invent employers, certifications, numbers, tools, titles, or achievements that are not supported by the text.
You may suggest placeholders like [number of users], [ticket volume], [team size] only when the user should add evidence.
Return ONLY valid JSON with this structure:
{
  "score": 0-100,
  "role_alignment": "one sentence",
  "current_positioning": "one sentence",
  "improved_headline": "copy-ready LinkedIn headline under 220 characters",
  "improved_about": "copy-ready About section, 120-180 words, first person, recruiter-friendly",
  "keyword_gaps": ["max 10 missing or underused recruiter keywords"],
  "experience_bullets": ["6 copy-ready bullet upgrades based only on supplied experience"],
  "priority_fixes": ["max 5 concrete fixes"],
  "search_keywords": ["max 12 keywords for LinkedIn search visibility"],
  "proof_needed": ["max 5 claims that need numbers/evidence"],
  "warnings": ["max 4 honest warnings about missing data or weak sections"]
}`

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeProfileUrl(value) {
  const raw = clean(value)
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^www\./i.test(raw)) return `https://${raw}`
  if (raw.includes('linkedin.com/')) return `https://${raw}`
  return raw
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function createServerSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  if (!header || typeof header !== 'string') return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const err = new Error('Your sign-in token was not sent to the server. Refresh the page and try again.')
    err.statusCode = 401
    err.code = 'AUTH_TOKEN_MISSING'
    throw err
  }

  if (!supabase) {
    const err = new Error('Profile optimizer authentication is not configured on the server. Check Supabase environment variables in Vercel.')
    err.statusCode = 500
    err.code = 'SUPABASE_AUTH_CONFIG_MISSING'
    throw err
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Your session could not be verified. Please refresh the page or sign in again.')
    err.statusCode = 401
    err.code = 'INVALID_SESSION'
    throw err
  }
  return data.user
}

function normalizePlan(value) {
  const plan = String(value || '').toLowerCase().trim()
  if (['pro', 'premium', 'professional'].includes(plan)) return 'pro'
  if (['starter', 'tier', 'plus', 'basic', 'paid'].includes(plan)) return 'starter'
  return 'free'
}

function resolveUserPlan(user) {
  const adminIds = (process.env.RATE_LIMIT_WHITELIST || process.env.ADMIN_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean)
  if (adminIds.includes(user?.id)) return PLAN_LIMITS.pro

  const meta = { ...(user?.user_metadata || {}), ...(user?.app_metadata || {}) }
  const status = String(meta.subscription_status || meta.stripe_subscription_status || '').toLowerCase()
  const rawPlan = meta.subscription_plan || meta.plan || meta.price_plan || meta.product_plan || meta.tier
  const planId = normalizePlan(rawPlan)
  if (planId !== 'free' && (!status || ['active', 'trialing', 'paid'].includes(status))) return PLAN_LIMITS[planId]
  return PLAN_LIMITS.free
}

function startOfMonthIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
}

function hash(value) {
  if (!value) return null
  const salt = process.env.USAGE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'joblytics'
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex')
}

function getRequestIdentity(req) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
  const ip = String(forwarded).split(',')[0].trim()
  const userAgent = req.headers['user-agent'] || ''
  const deviceId = String(req.headers['x-joblytics-device-id'] || '').slice(0, 120)
  return { deviceId, ipHash: hash(ip), userAgentHash: hash(userAgent) }
}

async function checkUsageLimit({ supabase, req, user, eventType }) {
  const plan = resolveUserPlan(user)
  const limit = plan.monthly[eventType] ?? 0
  const identity = getRequestIdentity(req)
  const since = startOfMonthIso()
  let used = 0
  let source = 'fallback'

  try {
    const filters = [`user_id.eq.${user.id}`]
    if (identity.deviceId) filters.push(`device_id.eq.${identity.deviceId}`)
    if (identity.ipHash) filters.push(`ip_hash.eq.${identity.ipHash}`)

    const { count, error } = await supabase
      .from('usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('created_at', since)
      .or(filters.join(','))

    if (!error) {
      used = count || 0
      source = 'usage_events'
    }
  } catch {}

  if (used >= limit) {
    const err = new Error(`${plan.label} limit reached: ${limit} ${eventType.replace('_', ' ')} per month. Upgrade to continue.`)
    err.statusCode = 429
    err.code = 'PLAN_LIMIT_REACHED'
    err.usage = { plan: plan.id, planLabel: plan.label, eventType, used, limit, remaining: 0, source }
    throw err
  }

  return { plan: plan.id, planLabel: plan.label, eventType, used, limit, remaining: Math.max(0, limit - used), source, identity }
}

async function recordUsageEvent({ supabase, user, eventType, usage, meta = {} }) {
  try {
    await supabase
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
  } catch {}
}

function publicUsage(usage, increment = 0) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createServerSupabaseClient()

  try {
    const user = await requireUser(req, supabase)
    const { profileText, targetRole, profileUrl } = req.body || {}
    const text = clean(profileText)
    const role = clean(targetRole) || 'the user target role'
    const url = normalizeProfileUrl(profileUrl)

    if (text.length < 120) {
      return res.status(400).json({
        error: 'Import your LinkedIn PDF or paste your profile text to run AI profile optimization.',
        code: 'PROFILE_TEXT_REQUIRED',
        profileUrl: url || null,
        checklist: [
          'Upload your LinkedIn profile PDF.',
          'Or paste your current headline.',
          'Paste your About section.',
          'Paste your Experience and Skills sections.'
        ]
      })
    }

    const usage = await checkUsageLimit({ supabase, req, user, eventType: 'profile_optimize' })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2200,
      temperature: 0.2,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TARGET ROLE:\n${role}\n\nLINKEDIN PROFILE URL REFERENCE:\n${url || 'Not provided'}\n\nPROFILE TEXT PROVIDED BY USER:\n${text.slice(0, 9000)}`
      }]
    })

    const raw = message.content.map(block => block.text || '').join('').trim().replace(/```json|```/g, '').trim()
    let result
    try {
      result = JSON.parse(raw)
    } catch (e) {
      console.error('Profile optimizer JSON parse failed:', raw.slice(0, 500))
      return res.status(500).json({ error: 'Profile optimization failed. Please try again.', code: 'BAD_AI_JSON' })
    }

    const safeArray = value => Array.isArray(value) ? value.map(clean).filter(Boolean) : []
    const score = Number.isFinite(Number(result.score)) ? Math.max(0, Math.min(100, Math.round(Number(result.score)))) : 0

    await recordUsageEvent({ supabase, user, eventType: 'profile_optimize', usage, meta: { targetRole: role, profileUrl: url || null } })

    return res.status(200).json({
      success: true,
      usage: publicUsage(usage, 1),
      analysis: {
        score,
        role_alignment: clean(result.role_alignment),
        current_positioning: clean(result.current_positioning),
        improved_headline: clean(result.improved_headline),
        improved_about: clean(result.improved_about),
        keyword_gaps: safeArray(result.keyword_gaps).slice(0, 10),
        experience_bullets: safeArray(result.experience_bullets).slice(0, 8),
        priority_fixes: safeArray(result.priority_fixes).slice(0, 5),
        search_keywords: safeArray(result.search_keywords).slice(0, 12),
        proof_needed: safeArray(result.proof_needed).slice(0, 5),
        warnings: safeArray(result.warnings).slice(0, 4),
        profile_url: url || null,
        target_role: role
      }
    })
  } catch (e) {
    console.error('Profile optimizer error:', e.message)
    return res.status(e.statusCode || 500).json({
      error: e.message || 'Profile optimization failed',
      code: e.code || 'PROFILE_OPTIMIZE_FAILED',
      usage: e.usage || null
    })
  }
}