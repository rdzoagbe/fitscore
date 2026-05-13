import Anthropic from '@anthropic-ai/sdk'
import { atsRequestSchema, atsResultSchema, type AtsRequest, type AtsResult } from '@/lib/ats/schema'
import { fallbackAtsAnalysis } from '@/lib/ats/fallback'

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
  throw new Error('No JSON object found in AI response')
}

function systemPrompt(language: 'fr' | 'en'): string {
  return language === 'fr'
    ? 'Tu es un expert ATS et recrutement. Réponds uniquement en JSON valide conforme au schéma demandé. Analyse le CV contre la fiche de poste. Ne crée pas de fausses expériences.'
    : 'You are an ATS and recruiting expert. Return only valid JSON matching the requested schema. Analyze the CV against the job description. Do not invent experience.'
}

function userPrompt(request: AtsRequest): string {
  return `Return a JSON object with this exact structure: overall_score number 0-100, scores {keywords, experience, skills, format, education}, matched_keywords array, missing_keywords array, recommendations array, format_issues array, estimated_ranking_percentile number 0-100, summary string.\n\nCV TEXT:\n${request.cvText.slice(0, 90000)}\n\nJOB DESCRIPTION:\n${request.jobDescription.slice(0, 45000)}`
}

export async function analyzeAts(input: unknown): Promise<AtsResult> {
  const request = atsRequestSchema.parse(input)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) return fallbackAtsAnalysis(request)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 3500,
      temperature: 0.2,
      system: systemPrompt(request.language),
      messages: [{ role: 'user', content: userPrompt(request) }]
    })

    const text = response.content
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n')

    const parsed = extractJson(text)
    return atsResultSchema.parse(parsed)
  } catch (error) {
    console.error('AI ATS analysis failed, using fallback', error)
    return fallbackAtsAnalysis(request)
  }
}
