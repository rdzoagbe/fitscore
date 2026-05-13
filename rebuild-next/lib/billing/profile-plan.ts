import { getPlan, type PlanDefinition } from '@/lib/billing/plans'
import { createClient } from '@/lib/supabase/server'

export async function getUserPlan(userId: string): Promise<PlanDefinition> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load user plan', error.message)
    return getPlan('free')
  }

  return getPlan(typeof data?.plan === 'string' ? data.plan : 'free')
}

export function isCheckoutConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}
