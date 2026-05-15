import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { validateSupabaseEnv } from '@/lib/supabase/env'

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
      get(name: string): string | undefined {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions): void {
        redirectResponse.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions): void {
        redirectResponse.cookies.set({ name, value: '', ...options })
      }
    }
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return redirectToLogin(requestUrl.origin, exchangeError.message)
  }

  return redirectResponse
}
