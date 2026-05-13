import { NextResponse, type NextRequest } from 'next/server'
import { analyzeAts } from '@/lib/ats/analyze'
import { atsRequestSchema } from '@/lib/ats/schema'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = atsRequestSchema.parse(body)
    const result = await analyzeAts(parsed)
    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid ATS analysis request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
