import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function json(res, status, body) { res.status(status).json(body) }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(res, 501, { error: 'stripe_not_configured', message: 'Billing portal is not active yet.' })
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return json(res, 501, { error: 'supabase_admin_not_configured' })

  const supabaseAdmin = createClient(url, key, { auth: { persistSession: false } })
  const token = (req.headers.authorization || '').startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  if (!token) return json(res, 401, { error: 'unauthorized' })

  const { data } = await supabaseAdmin.auth.getUser(token)
  const user = data?.user
  if (!user) return json(res, 401, { error: 'unauthorized' })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return json(res, 400, { error: 'missing_customer', message: 'No Stripe customer found for this account yet.' })
  }

  const appUrl = process.env.PUBLIC_APP_URL || 'https://joblytics-ai.com'
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/pricing`
  })

  return json(res, 200, { url: portal.url })
}
