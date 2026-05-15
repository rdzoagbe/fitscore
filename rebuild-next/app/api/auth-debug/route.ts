import { NextResponse } from 'next/server'
import { validateSupabaseEnv } from '@/lib/supabase/env'

export const dynamic = 'force-dynamic'

function mask(value: string): string {
  if (!value) return ''
  if (value.length <= 12) return `${value.slice(0, 3)}…`
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

function safeHost(value: string): string | null {
  if (!value) return null
  try {
    return new URL(value).host
  } catch {
    return null
  }
}

export async function GET(): Promise<NextResponse> {
  const result = validateSupabaseEnv()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()

  return NextResponse.json({
    ok: result.ok,
    message: result.ok ? 'Supabase auth environment is visible to this deployment.' : result.message,
    sources: result.env.source,
    supabaseUrlPresent: Boolean(result.env.url),
    supabaseUrlHost: safeHost(result.env.url),
    supabaseUrlLooksValid: Boolean(safeHost(result.env.url)),
    anonKeyPresent: Boolean(result.env.anonKey),
    anonKeyPreview: mask(result.env.anonKey),
    appUrl: appUrl || null,
    timestamp: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store' } })
}
