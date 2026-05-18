import { createClient } from '@supabase/supabase-js'

const PRICE_MAP = {
  starter: {
    id: 'starter',
    label: 'Joblytics AI Plus',
    priceId: process.env.STRIPE_PLUS_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID || 'price_1TM5bZ0E2aOc1laPuYuKWqZb',
    productId: process.env.STRIPE_PLUS_PRODUCT_ID || process.env.STRIPE_STARTER_PRODUCT_ID || 'prod_UKl7YAbL55zRKl'
  },
  plus: {
    id: 'starter',
    label: 'Joblytics AI Plus',
    priceId: process.env.STRIPE_PLUS_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID || 'price_1TM5bZ0E2aOc1laPuYuKWqZb',
    productId: process.env.STRIPE_PLUS_PRODUCT_ID || process.env.STRIPE_STARTER_PRODUCT_ID || 'prod_UKl7YAbL55zRKl'
  },
  pro: {
    id: 'pro',
    label: 'Joblytics AI Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_1TM5dJ0E2aOc1laPtsjFFjac',
    productId: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_UKl9LjXQYpvNeb'
  }
}

function clean(value) {
  return String(value || '').trim()
}

function getStripeSecretKey() {
  return clean(process.env.STRIPE_SECRET_KEY)
}

function assertStripeSecretKey() {
  const key = getStripeSecretKey()
  if (!key) {
    const err = new Error('Stripe is not configured yet. Add STRIPE_SECRET_KEY in Vercel.')
    err.statusCode = 503
    err.code = 'STRIPE_NOT_CONFIGURED'
    throw err
  }
  if (!/^sk_(test|live)_/.test(key)) {
    const err = new Error('Stripe secret key is invalid. In Vercel, STRIPE_SECRET_KEY must start with sk_test_ for testing or sk_live_ for live mode. Do not use mk_, pk_, price_ or prod_ values.')
    err.statusCode = 503
    err.code = 'STRIPE_SECRET_KEY_INVALID_FORMAT'
    throw err
  }
  return key
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

function createServerSupabaseClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = String(header).match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const err = new Error('Please sign in before subscribing.')
    err.statusCode = 401
    err.code = 'AUTH_TOKEN_MISSING'
    throw err
  }
  if (!supabase) {
    const err = new Error('Subscription authentication is not configured on the server.')
    err.statusCode = 500
    err.code = 'SUPABASE_CONFIG_MISSING'
    throw err
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Your session could not be verified. Please refresh and try again.')
    err.statusCode = 401
    err.code = 'INVALID_SESSION'
    throw err
  }
  return data.user
}

function getAppUrl(req) {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`.replace(/\/$/, '')
}

function assertBillingLegalAccepted(legalAcceptance) {
  const data = legalAcceptance || {}
  const ok = data.billing_legal_accepted === true && data.billing_terms_accepted === true && data.billing_privacy_acknowledged === true && data.withdrawal_acknowledged === true && data.digital_service_immediate_access_requested === true
  if (!ok) {
    const err = new Error('Please accept the billing legal terms and digital-service access acknowledgement before checkout.')
    err.statusCode = 400
    err.code = 'BILLING_LEGAL_ACCEPTANCE_REQUIRED'
    throw err
  }
}

function appendParam(params, key, value) {
  if (value !== undefined && value !== null && value !== '') params.append(key, String(value))
}

async function createStripeCheckoutSession({ req, user, plan, legalAcceptance }) {
  const stripeSecretKey = assertStripeSecretKey()
  const appUrl = getAppUrl(req)
  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('line_items[0][price]', plan.priceId)
  params.append('line_items[0][quantity]', '1')
  params.append('client_reference_id', user.id)
  params.append('success_url', `${appUrl}/billing?checkout=success&plan=${encodeURIComponent(plan.id)}&session_id={CHECKOUT_SESSION_ID}`)
  params.append('cancel_url', `${appUrl}/billing?checkout=cancelled&plan=${encodeURIComponent(plan.id)}`)
  params.append('allow_promotion_codes', 'true')
  params.append('billing_address_collection', 'auto')
  params.append('customer_email', user.email || '')

  const metadata = {
    user_id: user.id,
    user_email: user.email || '',
    plan_id: plan.id,
    plan_name: plan.label,
    stripe_product_id: plan.productId,
    terms_version: legalAcceptance.billing_terms_version || legalAcceptance.terms_version || '',
    terms_accepted_at: legalAcceptance.billing_terms_accepted_at || '',
    privacy_version: legalAcceptance.billing_privacy_version || legalAcceptance.privacy_version || '',
    withdrawal_acknowledged: String(Boolean(legalAcceptance.withdrawal_acknowledged)),
    withdrawal_acknowledged_at: legalAcceptance.withdrawal_acknowledged_at || '',
    billing_legal_version: legalAcceptance.billing_legal_version || '',
    billing_legal_accepted_at: legalAcceptance.billing_legal_accepted_at || '',
    digital_service_immediate_access_requested: String(Boolean(legalAcceptance.digital_service_immediate_access_requested))
  }

  Object.entries(metadata).forEach(([key, value]) => {
    appendParam(params, `metadata[${key}]`, value)
    appendParam(params, `subscription_data[metadata][${key}]`, value)
  })

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data?.error?.message || 'Stripe could not create the checkout session.')
    err.statusCode = 502
    err.code = 'STRIPE_CHECKOUT_FAILED'
    throw err
  }
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createServerSupabaseClient()
    const user = await requireUser(req, supabase)
    const { planId, legalAcceptance } = req.body || {}
    const plan = PRICE_MAP[clean(planId).toLowerCase()]
    if (!plan) return res.status(400).json({ error: 'Unknown subscription plan.', code: 'UNKNOWN_PLAN' })

    assertBillingLegalAccepted(legalAcceptance)
    const session = await createStripeCheckoutSession({ req, user, plan, legalAcceptance })

    return res.status(200).json({ success: true, url: session.url, sessionId: session.id, plan: plan.id })
  } catch (e) {
    console.error('Create checkout session error:', e)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Could not start checkout.', code: e.code || 'CHECKOUT_FAILED' })
  }
}