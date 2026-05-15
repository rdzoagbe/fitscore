import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard', '/tracker', '/scanner', '/cover-letters',
  '/interview', '/cv-enhancer', '/keywords', '/analytics',
  '/export-ipr', '/billing', '/settings', '/account', '/more'
]

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function middleware(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname

  const hasSession = request.cookies.getAll().some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (isProtectedPath(path) && !hasSession) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  if (hasSession && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/tracker/:path*', '/scanner/:path*',
    '/cover-letters/:path*', '/interview/:path*', '/cv-enhancer/:path*',
    '/keywords/:path*', '/analytics/:path*', '/export-ipr/:path*',
    '/billing/:path*', '/settings/:path*', '/account/:path*',
    '/more/:path*', '/login'
  ]
}