import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

function getPlanFromEvent(event) {
  const obj = event.data?.object || {}
  return obj.metadata?.plan_id || obj.lines?.data?.[0]?.price?.metadata?.plan_id || null
}

function normalizePlan(planId) {
  if (planId === 'pro_monthly') return 'pro'
  if (planId === 'job_search_pass') return 'job_search_pass'
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceKey) {
    return res.status(501).json({ error: 'billing_webhook_not_configured' })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  const rawBody = await buffer(req)
  const signature = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${error.message}` })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    const object = event.data.object || {}
    const userId = object.metadata?.user_id || object.subscription_details?.metadata?.user_id || null
    const customerId = object.customer || null
    const plan = normalizePlan(getPlanFromEvent(event))

    await supabaseAdmin.from('billing_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_customer_id: customerId,
      user_id: userId,
      payload: { id: object.id, status: object.status, mode: object.mode }
    }).select('id').maybeSingle()

    if (event.type === 'checkout.session.completed' && userId && plan) {
      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: userId,
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: object.subscription || null,
          plan_status: object.payment_status === 'paid' ? 'active' : object.status || 'pending',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
    }

    if (event.type === 'customer.subscription.deleted' && customerId) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ plan: 'free', plan_status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', customerId)
    }
  } catch (error) {
    console.error('Stripe webhook processing failed:', error)
    return res.status(500).json({ error: 'webhook_processing_failed' })
  }

  return res.status(200).json({ received: true })
}
