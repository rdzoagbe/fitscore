import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const protectedPrefixes = [
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
  '/more'
]

function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/login'
  redirectUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(redirectUrl)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const isProtected = protectedPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix))

  if (!isProtected) return NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return redirectToLogin(request)

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string): string | undefined {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions): void {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions): void {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request })
          response.cookies.set({ name, value: '', ...options })
        }
      }
    })

    const { data } = await supabase.auth.getUser()

    if (!data.user) return redirectToLogin(request)

    return response
  } catch (error) {
    console.error('Middleware auth check failed', error)
    return redirectToLogin(request)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
