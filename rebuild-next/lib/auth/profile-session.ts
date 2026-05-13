import { redirect } from 'next/navigation'
import { ensureUserProfile } from '@/lib/profile'
import { createClient } from '@/lib/supabase/server'

export async function requireUserSession(): Promise<{ id: string; email: string; name: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) redirect('/login')

  await ensureUserProfile(supabase, data.user)

  const email = data.user.email ?? ''
  const metaName = data.user.user_metadata?.full_name
  const name = typeof metaName === 'string' && metaName.trim().length > 0 ? metaName.trim() : email.split('@')[0] ?? 'User'

  return { id: data.user.id, email, name }
}
