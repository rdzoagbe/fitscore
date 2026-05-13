import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PLAN_PRICE_ENV = {
  job_search_pass: 'STRIPE_PRICE_JOB_SEARCH_PASS',
  pro_monthly: 'STRIPE_PRICE_PRO_MONTHLY'
}

function json(res, status, body) {
  res.status(status).json(body)
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function getUserFromToken(req, supabaseAdmin) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error) return null
  return data?.user || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const appUrl = process.env.PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || 'https://joblytics-ai.com'

  if (!stripeSecret) {
    return json(res, 501, {
      error: 'stripe_not_configured',
      message: 'Checkout is prepared but not active yet. Add STRIPE_SECRET_KEY and Stripe price IDs in Vercel to enable payments.'
    })
  }

  const { planId } = req.body || {}
  const priceEnvName = PLAN_PRICE_ENV[planId]
  const priceId = priceEnvName ? process.env[priceEnvName] : null

  if (!priceEnvName || !priceId) {
    return json(res, 400, {
      error: 'invalid_or_unconfigured_plan',
      message: 'This plan is not configured for checkout yet.'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return json(res, 501, {
      error: 'supabase_admin_not_configured',
      message: 'Billing needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY configured in Vercel.'
    })
  }

  const user = await getUserFromToken(req, supabaseAdmin)
  if (!user) {
    return json(res, 401, { error: 'unauthorized', message: 'Please sign in before starting checkout.' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('stripe_customer_id, email')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id || null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id, app: 'joblytics-ai' }
    })
    customerId = customer.id
    await supabaseAdmin
      .from('user_profiles')
      .upsert({ user_id: user.id, email: user.email, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }

  const mode = planId === 'pro_monthly' ? 'subscription' : 'payment'
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata: { user_id: user.id, plan_id: planId },
    subscription_data: mode === 'subscription' ? { metadata: { user_id: user.id, plan_id: planId } } : undefined
  })

  return json(res, 200, { url: session.url })
}
