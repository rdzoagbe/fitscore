import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { buildLimitPayload, getMonthStartIso, getUserPlan, isUnlimited } from './_planLimits.js'
import { aiErrorPayload, runWithAiRetry } from './_aiReliability.js'

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

async function getUsageGate(supabase, user, endpoint) {
  const plan = await getUserPlan(supabase, user)
  const monthStart = getMonthStartIso()

  const { count, error: countError } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
    .gte('created_at', monthStart)

  if (countError) throw countError
  const used = count || 0
  const limit = plan.coverLetterLimit

  if (!isUnlimited(plan) && used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      plan,
      payload: buildLimitPayload({ action: 'cover letter', plan, used, limit })
    }
  }

  return { allowed: true, used, limit, plan }
}

async function recordUsage(supabase, user, endpoint, gate) {
  const { error } = await supabase.from('api_usage').insert({ user_id: user.id, endpoint })
  if (error) throw error
  return {
    action: 'cover letter',
    planId: gate.plan.id,
    planLabel: gate.plan.label,
    used: gate.used + 1,
    limit: gate.limit,
    remaining: isUnlimited(gate.plan) ? 9999 : Math.max(0, gate.limit - gate.used - 1)
  }
}

const SALUTATIONS = {
  en: 'Dear Hiring Manager,',
  fr: 'Madame, Monsieur,',
  es: 'Estimado/a equipo de selección,',
  de: 'Sehr geehrte Damen und Herren,',
  it: 'Gentile Responsabile delle Risorse Umane,',
  pt: 'Prezada Equipa de Recrutamento,'
}

const SIGN_OFFS = {
  professional: { en: 'Best regards', fr: 'Cordialement', es: 'Atentamente', de: 'Mit freundlichen Grüßen', it: 'Cordiali saluti', pt: 'Com os melhores cumprimentos' },
  warm: { en: 'Looking forward to connecting', fr: 'Au plaisir de vous lire', es: 'Un cordial saludo', de: 'Herzliche Grüße', it: 'A presto', pt: 'Aguardo o vosso contacto' },
  formal: { en: 'Yours sincerely', fr: 'Veuillez agréer mes salutations distinguées', es: 'Reciba un cordial saludo', de: 'Hochachtungsvoll', it: 'Distinti saluti', pt: 'Os meus cumpriments' },
  enthusiastic: { en: 'Looking forward to hearing from you', fr: 'Dans l\'attente de vous rencontrer', es: 'Quedo a la espera de su respuesta', de: 'Ich freue mich auf Ihre Rückmeldung', it: 'Resto in attesa di un Suo riscontro', pt: 'Fico ansioso pelo vosso contacto' }
}

function pickSalutation(recipient, lang) {
  if (recipient && recipient.trim()) {
    const name = recipient.trim()
    if (lang === 'fr') return `Bonjour ${name},`
    if (lang === 'es') return `Estimado/a ${name},`
    if (lang === 'de') return `Sehr geehrte/r ${name},`
    if (lang === 'it') return `Gentile ${name},`
    if (lang === 'pt') return `Caro/a ${name},`
    return `Dear ${name},`
  }
  return SALUTATIONS[lang] || SALUTATIONS.en
}

function getLengthSpec(length) {
  return {
    short: {
      instruction: 'VERY SHORT — 1 tight paragraph, 70-90 words total. Get straight to the point: who you are + top match + interest. No fluff.',
      structure: 'exactly 1 paragraph (4-6 sentences max)',
      wordCap: 90,
      maxTokens: 400
    },
    standard: {
      instruction: 'STANDARD length — 3 short paragraphs, 180-220 words total.',
      structure: 'exactly 3 short paragraphs:\n  - Paragraph 1: express genuine interest in the role, mention your top relevant qualification\n  - Paragraph 2: 2-3 specific achievements matching the role requirements\n  - Paragraph 3: forward-looking close, express interest in next steps',
      wordCap: 220,
      maxTokens: 800
    },
    detailed: {
      instruction: 'DETAILED — 4 paragraphs, 280-340 words total. More depth, more specific examples, more elaboration on motivation.',
      structure: 'exactly 4 paragraphs:\n  - Paragraph 1: opening, interest in the role, why this company specifically if inferable\n  - Paragraph 2: 2 strongest achievements aligned with the role\n  - Paragraph 3: relevant skills and contribution\n  - Paragraph 4: forward-looking close',
      wordCap: 340,
      maxTokens: 1200
    }
  }[length] || {
    instruction: 'STANDARD length — 3 short paragraphs, 180-220 words total.',
    structure: 'exactly 3 short paragraphs',
    wordCap: 220,
    maxTokens: 800
  }
}

function getLangInstruction(lang) {
  return {
    en: 'Write the letter body in English.',
    fr: 'Rédige le corps de la lettre en français.',
    es: 'Escribe el cuerpo de la carta en español.',
    de: 'Schreibe den Brieftext auf Deutsch.',
    it: 'Scrivi il corpo della lettera in italiano.',
    pt: 'Escreve o corpo da carta em português.'
  }[lang] || 'Write the letter body in English.'
}

function getToneInstruction(tone) {
  return {
    professional: 'Confident and professional but not stiff.',
    warm: 'Warm and personable while still professional.',
    formal: 'Highly formal and respectful (suitable for traditional industries).',
    enthusiastic: 'Enthusiastic and energetic, conveying passion for the role.'
  }[tone] || 'Confident and professional but not stiff.'
}

function cleanBody(text) {
  return String(text || '')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^Dear\s+.*?,\s*/i, '')
    .replace(/^(Madame, Monsieur,|Bonjour\s+.*?,)\s*/i, '')
    .trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  let usageGate = null
  let supabase = null
  let user = null

  try {
    supabase = getSupabaseAdmin()
    user = await getAuthenticatedUser(req, supabase)
    if (!user) return res.status(401).json({ error: 'Please sign in again before generating a cover letter.' })

    usageGate = await getUsageGate(supabase, user, 'cover-letter')
    if (!usageGate.allowed) {
      return res.status(429).json({ ...usageGate.payload, rate_limited: true, usage: usageGate.payload.usage })
    }

    const { analysis, lang = 'en', tone = 'professional', length = 'standard', recipient = null, fullName = null } = req.body
    if (!analysis?.job_context) return res.status(400).json({ error: 'Missing analysis context' })

    const lengthSpec = getLengthSpec(length)
    const r = analysis
    const prompt = `Write the BODY ONLY of a cover letter for this job application. Do NOT include salutation, date, address, sign-off, or signature.\n\nJOB: ${r.job_context?.title || 'Position'} at ${r.job_context?.company || 'the company'}\nLOCATION: ${r.job_context?.location || 'Not specified'}\nCONTRACT: ${r.job_context?.contract_type || 'Not specified'}\n\nJOB SUMMARY: ${(r.job_summary || '').slice(0, 900)}\n\nCANDIDATE STRENGTHS:\n${(r.interview_prep?.your_edges || []).slice(0, 5).map(e => '- ' + String(e).slice(0, 220)).join('\n') || '- Strong relevant skills'}\n\nKEYWORDS TO NATURALLY INCLUDE:\n${(r.keyword_match?.found || []).slice(0, 8).join(', ') || 'relevant skills'}\n\nCRITICAL GAPS TO ADDRESS IF POSSIBLE:\n${(r.critical_gaps || []).slice(0, 4).map(g => '- ' + String(g).slice(0, 160)).join('\n') || '- None'}\n\nINSTRUCTIONS:\n- ${getLangInstruction(lang)}\n- Tone: ${getToneInstruction(tone)}\n- Length: ${lengthSpec.instruction}\n- Structure: ${lengthSpec.structure}\n- Maximum ${lengthSpec.wordCap} words for the body.\n- Return ONLY paragraphs separated by blank lines.`

    const model = process.env.ANTHROPIC_COVER_LETTER_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
    const message = await runWithAiRetry(() => client.messages.create({
      model,
      max_tokens: lengthSpec.maxTokens,
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }]
    }), { attempts: 3, baseDelayMs: 800 })

    const body = cleanBody(message.content.map(b => b.text || '').join('').trim())
    if (!body || body.length < 40) return res.status(502).json({ error: 'The AI provider returned an empty cover letter. Please try again.', code: 'ai_empty_output', retryable: true })

    const usage = await recordUsage(supabase, user, 'cover-letter', usageGate)
    const salutation = pickSalutation(recipient, lang)
    const signOff = (SIGN_OFFS[tone] || SIGN_OFFS.professional)[lang] || (SIGN_OFFS[tone] || SIGN_OFFS.professional).en
    const name = (fullName && fullName.trim()) ? fullName.trim() : ''
    const letter = `${salutation}\n\n${body}\n\n${signOff},\n${name}`.trim()

    return res.status(200).json({ success: true, letter, salutation, signOff, body, usage })
  } catch (e) {
    console.error('Cover letter error:', {
      message: e.message,
      status: e.status,
      type: e?.error?.type,
      apiMessage: e?.error?.message
    })
    const payload = aiErrorPayload(e, 'cover_letter')
    return res.status(payload.code?.startsWith('ai_') ? (e.status === 400 ? 400 : 503) : 500).json(payload)
  }
}
