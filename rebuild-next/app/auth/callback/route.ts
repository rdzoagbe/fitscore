import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateSupabaseEnv } from '@/lib/supabase/env'

type CookieEntry = { name: string; value: string; options?: Record<string, unknown> }

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

  const envCheck = validateSupabaseEnv()
  if (!envCheck.ok) {
    return redirectToLogin(requestUrl.origin, envCheck.message)
  }

  const redirectResponse = NextResponse.redirect(new URL(next, requestUrl.origin))

  const supabase = createServerClient(envCheck.env.url, envCheck.env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieEntry[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cookiesToSet.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options as any))
      }
    }
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return redirectToLogin(requestUrl.origin, exchangeError.message)
  }

  return redirectResponse
}
