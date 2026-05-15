import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const plan = request.nextUrl.searchParams.get('plan') ?? 'tier'
  const billingUrl = new URL('/billing', request.url)
  billingUrl.searchParams.set('checkout', 'not_configured')
  billingUrl.searchParams.set('plan', plan)
  return NextResponse.redirect(billingUrl)
}
