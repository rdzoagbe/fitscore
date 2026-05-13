import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

function getFullName(user: User): string | null {
  const fullName = user.user_metadata?.full_name
  return typeof fullName === 'string' && fullName.trim().length > 0 ? fullName.trim() : null
}

export async function ensureUserProfile(supabase: SupabaseClient, user: User): Promise<void> {
  const email = user.email
  if (!email) return

  const payload = {
    id: user.id,
    email,
    full_name: getFullName(user),
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    console.error('Failed to ensure user profile', error.message)
  }
}
