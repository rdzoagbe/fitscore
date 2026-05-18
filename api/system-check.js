function has(value) {
  return Boolean(String(value || '').trim())
}

function maskedEmail(value) {
  const email = String(value || '').trim()
  if (!email || !email.includes('@')) return null
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}***@${domain}`
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const contactTo = process.env.CONTACT_TO_EMAIL || 'admin@joblytics-ai.com'
  const contactFrom = process.env.CONTACT_FROM_EMAIL || 'Joblytics <admin@joblytics-ai.com>'
  const plusPrice = process.env.STRIPE_PLUS_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID || 'price_1TM5bZ0E2aOc1laPuYuKWqZb'
  const proPrice = process.env.STRIPE_PRO_PRICE_ID || 'price_1TM5dJ0E2aOc1laPtsjFFjac'

  const checks = {
    anthropic: has(process.env.ANTHROPIC_API_KEY),
    supabase_url: has(supabaseUrl),
    supabase_key: has(supabaseKey),
    resend_api_key: has(process.env.RESEND_API_KEY),
    contact_to_email: has(contactTo),
    contact_from_email: has(contactFrom),
    stripe_secret_key: has(process.env.STRIPE_SECRET_KEY),
    stripe_webhook_secret: has(process.env.STRIPE_WEBHOOK_SECRET),
    stripe_plus_price_id: has(plusPrice),
    stripe_pro_price_id: has(proPrice)
  }

  const ready = {
    ai: checks.anthropic,
    auth_and_database: checks.supabase_url && checks.supabase_key,
    direct_contact_email: checks.resend_api_key && checks.contact_to_email && checks.contact_from_email,
    stripe: checks.stripe_secret_key && checks.stripe_webhook_secret && checks.stripe_plus_price_id && checks.stripe_pro_price_id
  }

  return res.status(200).json({
    ok: true,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    checks,
    ready,
    contact: {
      to: maskedEmail(contactTo),
      from_configured: checks.contact_from_email
    },
    stripe: {
      plus_price_configured: checks.stripe_plus_price_id,
      pro_price_configured: checks.stripe_pro_price_id,
      webhook_configured: checks.stripe_webhook_secret
    },
    note: 'This endpoint only returns boolean readiness checks. It never exposes secret values.'
  })
}