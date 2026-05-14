import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

function redirectToLoginWithError(origin: string, message: string): NextResponse {
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', message)
  return NextResponse.redirect(loginUrl)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const next = safeNextPath(request.nextUrl.searchParams.get('next'))
  const origin = request.nextUrl.origin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectToLoginWithError(origin, 'Authentication is not configured on this deployment. Missing Supabase environment variables.')
  }

  try {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    })

    if (error || !data.url) {
      return redirectToLoginWithError(origin, error?.message ?? 'Google sign-in could not be started.')
    }

    return NextResponse.redirect(data.url)
  } catch (error) {
    console.error('Google auth route failed', error)
    return redirectToLoginWithError(origin, 'Google sign-in failed to start. Check Supabase and Vercel production environment variables.')
  }
}
