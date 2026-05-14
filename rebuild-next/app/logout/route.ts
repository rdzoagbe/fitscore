import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function signOutAndRedirect(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()
  await supabase.auth.signOut()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('logged_out', '1')

  const response = NextResponse.redirect(loginUrl, { status: 303 })

  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
    }
  })

  return response
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return signOutAndRedirect(request)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return signOutAndRedirect(request)
}
