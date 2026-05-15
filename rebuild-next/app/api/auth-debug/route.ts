import { NextResponse } from 'next/server'
import { validateSupabaseEnv } from '@/lib/supabase/env'

function mask(value: string): string {
  if (!value) return ''
  if (value.length <= 12) return `${value.slice(0, 3)}…`
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

export async function GET(): Promise<NextResponse> {
  const result = validateSupabaseEnv()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()

  return NextResponse.json({
    ok: result.ok,
    message: result.ok ? 'Supabase auth environment is visible to this deployment.' : result.message,
    sources: result.env.source,
    supabaseUrlPresent: Boolean(result.env.url),
    supabaseUrlHost: result.env.url ? new URL(result.env.url).host : null,
    anonKeyPresent: Boolean(result.env.anonKey),
    anonKeyPreview: mask(result.env.anonKey),
    appUrl: appUrl || null,
    timestamp: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store' } })
}
