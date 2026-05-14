import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeNextPath(request.nextUrl.searchParams.get('next'))
  const origin = request.nextUrl.origin
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    }
  })

  if (error || !data.url) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', error?.message ?? 'Google sign-in could not be started.')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(data.url)
}
