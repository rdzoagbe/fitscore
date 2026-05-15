import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/tracker',
  '/scanner',
  '/cover-letters',
  '/interview',
  '/cv-enhancer',
  '/keywords',
  '/analytics',
  '/export-ipr',
  '/billing',
  '/settings',
  '/account',
  '/more'
]

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const path = request.nextUrl.pathname
  let response = NextResponse.next({ request })

  if (!hasSupabaseEnv()) {
    if (isProtectedPath(path)) return redirectToLogin(request)
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtectedPath(path) && !user) return redirectToLogin(request)
  if (user && path === '/login') return NextResponse.redirect(new URL('/dashboard', request.url))

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/tracker/:path*', '/scanner/:path*', '/cover-letters/:path*', '/interview/:path*', '/cv-enhancer/:path*', '/keywords/:path*', '/analytics/:path*', '/export-ipr/:path*', '/billing/:path*', '/settings/:path*', '/account/:path*', '/more/:path*', '/login']
}
