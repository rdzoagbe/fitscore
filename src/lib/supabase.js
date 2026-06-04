import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Joblytics] Missing Supabase env vars — auth will not work.\n' +
    `  VITE_SUPABASE_URL: ${supabaseUrl ? '✓ set' : '✗ MISSING'}\n` +
    `  VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓ set' : '✗ MISSING'}\n` +
    '  Fix: add these to your Vercel project → Settings → Environment Variables, then redeploy.'
  )
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
})
