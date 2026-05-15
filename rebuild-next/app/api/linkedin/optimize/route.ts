import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { url?: string; targetRole?: string }
  const { url, targetRole } = body

  if (!url || !url.startsWith('https://www.linkedin.com/in/')) {
    return NextResponse.json({ error: 'Provide a valid LinkedIn profile URL.' }, { status: 400 })
  }

  const prompt = `You are a senior recruiter and LinkedIn optimization expert.

Analyze this LinkedIn profile: ${url}
${targetRole ? `Target role: ${targetRole}` : ''}

Provide section-by-section feedback with copy-paste-ready improvements for:
1. Headline
2. About / Summary
3. Experience descriptions (top 2 roles)
4. Skills section
5. Overall recruiter-magnet score (0-100)

Be specific, actionable, and write in the user's voice. Keep feedback concise.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const feedback = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ feedback })
  } catch {
    return NextResponse.json({ error: 'AI analysis failed. Try again.' }, { status: 500 })
  }
}
