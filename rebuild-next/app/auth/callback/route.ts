import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

function redirectToLogin(origin: string, message: string): NextResponse {
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', message)
  return NextResponse.redirect(loginUrl)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = safeNext(requestUrl.searchParams.get('next'))

  if (error) {
    return redirectToLogin(requestUrl.origin, errorDescription ?? error)
  }

  if (!code) {
    return redirectToLogin(requestUrl.origin, 'Authentication callback did not include a code.')
  }

  const supabase = createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return redirectToLogin(requestUrl.origin, exchangeError.message)
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
