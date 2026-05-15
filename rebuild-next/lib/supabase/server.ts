import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/supabase/env'

export function createClient(): SupabaseClient {
  const cookieStore = cookies()
  const env = getSupabaseEnv()

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions): void {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions): void {
        cookieStore.set({ name, value: '', ...options })
      }
    }
  })
}
