import { createClient } from '@supabase/supabase-js'

const PLANS = {
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

const clean = value => String(value || '').trim()
const env = name => process.env[name]

function stripeKey() {
  const key = clean(env(['STRIPE', 'SECRET', 'KEY'].join('_')))
  if (!key) {
    const err = new Error('Stripe is not configured yet. Add the server-side Stripe key in Vercel.')
    err.statusCode = 503
    err.code = 'PAYMENT_PROVIDER_NOT_CONFIGURED'
    throw err
  }
  if (!key.startsWith('sk_')) {
    const err = new Error('The Stripe key configured in Vercel is not valid for server-side checkout.')
    err.statusCode = 503
    err.code = 'PAYMENT_PROVIDER_KEY_INVALID'
    throw err
  }
  return key
}

function createSupabase() {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || env('NEXT_PUBLIC_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_KEY') || env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY') || env('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function bearer(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  return String(header).match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null
}

async function requireUser(req, supabase) {
  const token = bearer(req)
  if (!token) {
    const err = new Error('Please sign in before subscribing.')
    err.statusCode = 401
    err.code = 'AUTH_REQUIRED'
    throw err
  }
  if (!supabase) {
    const err = new Error('Subscription authentication is not configured on the server.')
    err.statusCode = 500
    err.code = 'DATABASE_CONFIG_MISSING'
    throw err
  }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    const err = new Error('Your session could not be verified. Please refresh and try again.')
    err.statusCode = 401
    err.code = 'SESSION_INVALID'
    throw err
  }
  return data.user
}

function appUrl(req) {
  const configured = env('PUBLIC_APP_URL') || env('VITE_PUBLIC_APP_URL') || env('NEXT_PUBLIC_APP_URL')
  if (configured) return configured.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`.replace(/\/$/, '')
}

function requireLegal(data = {}) {
  const accepted = data.billing_legal_accepted === true && data.billing_terms_accepted === true && data.billing_privacy_acknowledged === true && data.withdrawal_acknowledged === true && data.digital_service_immediate_access_requested === true
  if (!accepted) {
    const err = new Error('Please accept the billing legal terms and digital-service access acknowledgement before checkout.')
    err.statusCode = 400
    err.code = 'LEGAL_ACCEPTANCE_REQUIRED'
    throw err
  }
}

function add(params, key, value) {
  if (value !== undefined && value !== null && value !== '') params.append(key, String(value))
}

async function checkout({ req, user, plan, legal }) {
  const baseUrl = appUrl(req)
  const params = new URLSearchParams()
  params.append('mode', 'subscription')
  params.append('line_items[0][price]', plan.priceId)
  params.append('line_items[0][quantity]', '1')
  params.append('client_reference_id', user.id)
  params.append('success_url', `${baseUrl}/billing?checkout=success&plan=${encodeURIComponent(plan.id)}&session_id={CHECKOUT_SESSION_ID}`)
  params.append('cancel_url', `${baseUrl}/billing?checkout=cancelled&plan=${encodeURIComponent(plan.id)}`)
  params.append('allow_promotion_codes', 'true')
  params.append('billing_address_collection', 'auto')
  params.append('customer_email', user.email || '')

  const metadata = {
    user_id: user.id,
    user_email: user.email || '',
    plan_id: plan.id,
    plan_name: plan.label,
    stripe_product_id: plan.productId,
    terms_version: legal.billing_terms_version || legal.terms_version || '',
    terms_accepted_at: legal.billing_terms_accepted_at || '',
    privacy_version: legal.billing_privacy_version || legal.privacy_version || '',
    withdrawal_ack: String(Boolean(legal.withdrawal_acknowledged)),
    withdrawal_ack_at: legal.withdrawal_acknowledged_at || '',
    legal_version: legal.billing_legal_version || '',
    legal_accepted_at: legal.billing_legal_accepted_at || '',
    immediate_access: String(Boolean(legal.digital_service_immediate_access_requested))
  }

  Object.entries(metadata).forEach(([key, value]) => {
    add(params, `metadata[${key}]`, value)
    add(params, `subscription_data[metadata][${key}]`, value)
  })

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data?.error?.message || 'Stripe could not create the checkout session.')
    err.statusCode = 502
    err.code = 'CHECKOUT_CREATE_FAILED'
    throw err
  }
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = createSupabase()
    const user = await requireUser(req, supabase)
    const { planId, legalAcceptance } = req.body || {}
    const plan = PLANS[clean(planId).toLowerCase()]
    if (!plan) return res.status(400).json({ error: 'Unknown subscription plan.', code: 'UNKNOWN_PLAN' })
    requireLegal(legalAcceptance)
    const session = await checkout({ req, user, plan, legal: legalAcceptance })
    return res.status(200).json({ success: true, url: session.url, sessionId: session.id, plan: plan.id })
  } catch (e) {
    console.error('Checkout v2 error:', e)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Could not start checkout.', code: e.code || 'CHECKOUT_FAILED' })
  }
}
