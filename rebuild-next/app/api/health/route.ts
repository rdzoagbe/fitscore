import { NextResponse } from 'next/server'
import { release } from '@/lib/release'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    release,
    timestamp: new Date().toISOString()
  }, { headers: { 'Cache-Control': 'no-store' } })
}
