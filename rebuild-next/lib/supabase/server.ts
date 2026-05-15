import { cookies } from 'next/headers'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'

export function createClient(): SupabaseClient {
  const cookieStore = cookies()
  const env = getSupabaseEnv()
  const cookieMethods: CookieMethodsServer = {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
    }
  }
  return createServerClient(env.url, env.anonKey, { cookies: cookieMethods })
}
