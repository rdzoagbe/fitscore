import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

function getRequiredBrowserEnv(): { readonly url: string; readonly anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error('Missing Supabase browser environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.')
  }

  return { url, anonKey }
}

export function createClient(): SupabaseClient {
  const { url, anonKey } = getRequiredBrowserEnv()
  return createBrowserClient(url, anonKey)
}
