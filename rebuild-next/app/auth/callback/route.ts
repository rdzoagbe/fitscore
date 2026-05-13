import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNext(requestUrl.searchParams.get('next'))

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
