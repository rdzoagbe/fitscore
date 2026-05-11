import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { aiErrorPayload, runWithAiRetry } from '../server/_aiReliability.js'
import { buildUsageResponse, getUsageGate, recordUsageEvent, USAGE_ACTIONS } from '../server/_usageEvents.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server configuration is missing.')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function getAuthenticatedUser(req, supabase) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) return null
  return data.user
}

const SALUTATIONS = { en: 'Dear Hiring Manager,', fr: 'Madame, Monsieur,' }
const SIGN_OFFS = {
  professional: { en: 'Best regards', fr: 'Cordialement' },
  warm: { en: 'Looking forward to connecting', fr: 'Au plaisir de vous lire' },
  formal: { en: 'Yours sincerely', fr: 'Veuillez agréer mes salutations distinguées' },
  enthusiastic: { en: 'Looking forward to hearing from you', fr: 'Dans l’attente de vous rencontrer' }
}

function pickSalutation(recipient, lang) {
  if (recipient && recipient.trim()) return lang === 'fr' ? `Bonjour ${recipient.trim()},` : `Dear ${recipient.trim()},`
  return SALUTATIONS[lang] || SALUTATIONS.en
}

function getLengthSpec(length) {
  const specs = {
    short: { instruction: '1 tight paragraph, 70-90 words total.', structure: 'exactly 1 paragraph', wordCap: 90, maxTokens: 400 },
    detailed: { instruction: '4 paragraphs, 280-340 words total.', structure: 'exactly 4 paragraphs', wordCap: 340, maxTokens: 1200 }
  }
  return specs[length] || { instruction: '3 short paragraphs, 180-220 words total.', structure: 'exactly 3 short paragraphs', wordCap: 220, maxTokens: 800 }
}

function getLangInstruction(lang) {
  return lang === 'fr' ? 'Rédige le corps de la lettre en français.' : 'Write the letter body in English.'
}

function getToneInstruction(tone) {
  return {
    warm: 'Warm and personable while still professional.',
    formal: 'Highly formal and respectful.',
    enthusiastic: 'Enthusiastic and energetic.',
    professional: 'Confident and professional but not stiff.'
  }[tone] || 'Confident and professional but not stiff.'
}

function cleanBody(text) {
  return String(text || '').replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').replace(/^Dear\s+.*?,\s*/i, '').replace(/^(Madame, Monsieur,|Bonjour\s+.*?,)\s*/i, '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const supabase = getSupabaseAdmin()
    const user = await getAuthenticatedUser(req, supabase)
    if (!user) return res.status(401).json({ error: 'Please sign in again before generating a cover letter.' })

    const usageGate = await getUsageGate(supabase, user, USAGE_ACTIONS.COVER_LETTER)
    if (!usageGate.allowed) return res.status(429).json({ ...usageGate.payload, rate_limited: true, usage: usageGate.payload.usage })

    const { analysis, lang = 'en', tone = 'professional', length = 'standard', recipient = null, fullName = null } = req.body
    if (!analysis?.job_context) return res.status(400).json({ error: 'Missing analysis context' })

    const lengthSpec = getLengthSpec(length)
    const r = analysis
    const prompt = `Write the BODY ONLY of a cover letter. Do not include salutation or sign-off.\n\nJob: ${r.job_context?.title || 'Position'} at ${r.job_context?.company || 'the company'}\nSummary: ${(r.job_summary || '').slice(0, 900)}\nStrengths:\n${(r.interview_prep?.your_edges || []).slice(0, 5).map(e => '- ' + String(e).slice(0, 220)).join('\n') || '- Strong relevant skills'}\nKeywords: ${(r.keyword_match?.found || []).slice(0, 8).join(', ') || 'relevant skills'}\n\nInstructions:\n- ${getLangInstruction(lang)}\n- Tone: ${getToneInstruction(tone)}\n- Length: ${lengthSpec.instruction}\n- Structure: ${lengthSpec.structure}\n- Maximum ${lengthSpec.wordCap} words.\n- Return only paragraphs.`

    const model = process.env.ANTHROPIC_COVER_LETTER_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    const message = await runWithAiRetry(() => client.messages.create({ model, max_tokens: lengthSpec.maxTokens, temperature: 0.6, messages: [{ role: 'user', content: prompt }] }), { attempts: 3, baseDelayMs: 800 })
    const body = cleanBody(message.content.map(b => b.text || '').join('').trim())
    if (!body || body.length < 40) return res.status(502).json({ error: 'The AI provider returned an empty cover letter. Please try again.', code: 'ai_empty_output', retryable: true })

    await recordUsageEvent(supabase, user, USAGE_ACTIONS.COVER_LETTER, { source: 'cover_letter_api', language: lang, tone, length })
    const usage = buildUsageResponse(usageGate, 1)
    const salutation = pickSalutation(recipient, lang)
    const signOff = (SIGN_OFFS[tone] || SIGN_OFFS.professional)[lang] || (SIGN_OFFS[tone] || SIGN_OFFS.professional).en
    const name = (fullName && fullName.trim()) ? fullName.trim() : ''
    const letter = `${salutation}\n\n${body}\n\n${signOff},\n${name}`.trim()
    return res.status(200).json({ success: true, letter, salutation, signOff, body, usage })
  } catch (e) {
    console.error('Cover letter error:', { message: e.message, status: e.status, type: e?.error?.type })
    const payload = aiErrorPayload(e, 'cover_letter')
    return res.status(payload.code?.startsWith('ai_') ? (e.status === 400 ? 400 : 503) : 500).json(payload)
  }
}
