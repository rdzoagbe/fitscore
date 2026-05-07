import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const COVER_LETTER_DAILY_LIMIT = Number(process.env.COVER_LETTER_DAILY_LIMIT || 20)

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

async function checkAndRecordUsage(supabase, userId, endpoint) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await supabase
    .from('api_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', oneDayAgo)

  if (countError) throw countError
  const used = count || 0
  if (used >= COVER_LETTER_DAILY_LIMIT) {
    return {
      allowed: false,
      used,
      limit: COVER_LETTER_DAILY_LIMIT,
      message: `Daily cover letter limit reached (${COVER_LETTER_DAILY_LIMIT}/day). Please try again tomorrow.`
    }
  }

  const { error: insertError } = await supabase
    .from('api_usage')
    .insert({ user_id: userId, endpoint })
  if (insertError) throw insertError

  return { allowed: true, used: used + 1, limit: COVER_LETTER_DAILY_LIMIT }
}

// Locale-aware salutations and sign-offs
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
  formal: { en: 'Yours sincerely', fr: 'Veuillez agréer mes salutations distinguées', es: 'Reciba un cordial saludo', de: 'Hochachtungsvoll', it: 'Distinti saluti', pt: 'Os meus cumprimentos' },
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const supabase = getSupabaseAdmin()
    const user = await getAuthenticatedUser(req, supabase)
    if (!user) return res.status(401).json({ error: 'Please sign in again before generating a cover letter.' })

    const usage = await checkAndRecordUsage(supabase, user.id, 'cover-letter')
    if (!usage.allowed) {
      return res.status(429).json({ error: usage.message, rate_limited: true, usage })
    }

    const { analysis, lang = 'en', tone = 'professional', length = 'standard', recipient = null, fullName = null } = req.body
    if (!analysis?.job_context) return res.status(400).json({ error: 'Missing analysis context' })

    const lengthSpec = {
      short: {
        instruction: 'VERY SHORT — 1 tight paragraph, 70-90 words total. Get straight to the point: who you are + top match + interest. No fluff.',
        structure: 'exactly 1 paragraph (4-6 sentences max)',
        wordCap: 90,
        maxTokens: 400
      },
      standard: {
        instruction: 'STANDARD length — 3 short paragraphs, 180-220 words total.',
        structure: 'exactly 3 short paragraphs:\n  - Paragraph 1: express genuine interest in the role, mention your top relevant qualification\n  - Paragraph 2: 2-3 specific achievements matching the role requirements (use real numbers if your_edges has them)\n  - Paragraph 3: forward-looking close, express interest in next steps',
        wordCap: 220,
        maxTokens: 800
      },
      detailed: {
        instruction: 'DETAILED — 4 paragraphs, 280-340 words total. More depth, more specific examples, more elaboration on motivation.',
        structure: 'exactly 4 paragraphs:\n  - Paragraph 1: opening, interest in the role, why this company specifically (1-2 sentences about company values/mission if inferable)\n  - Paragraph 2: 2 strongest achievements aligned with the role with concrete details/numbers\n  - Paragraph 3: relevant skills and how you would specifically contribute to the role\n  - Paragraph 4: forward-looking close, mention availability and interest in discussing further',
        wordCap: 340,
        maxTokens: 1200
      }
    }[length] || {
      instruction: 'STANDARD length — 3 short paragraphs, 180-220 words total.',
      structure: 'exactly 3 short paragraphs',
      wordCap: 220,
      maxTokens: 800
    }

    const r = analysis
    const langInstruction = {
      en: 'Write the letter body in English.',
      fr: 'Rédige le corps de la lettre en français.',
      es: 'Escribe el cuerpo de la carta en español.',
      de: 'Schreibe den Brieftext auf Deutsch.',
      it: 'Scrivi il corpo della lettera in italiano.',
      pt: 'Escreve o corpo da carta em português.'
    }[lang] || 'Write the letter body in English.'

    const toneInstruction = {
      professional: 'Confident and professional but not stiff.',
      warm: 'Warm and personable while still professional.',
      formal: 'Highly formal and respectful (suitable for traditional industries).',
      enthusiastic: 'Enthusiastic and energetic, conveying passion for the role.'
    }[tone] || 'Confident and professional but not stiff.'

    const prompt = `Write the BODY ONLY of a cover letter for this job application. Do NOT include any salutation (no "Dear..."), date, address, or sign-off. Just the body content.

JOB: ${r.job_context?.title || 'Position'} at ${r.job_context?.company || 'the company'}
LOCATION: ${r.job_context?.location || 'Not specified'}
CONTRACT: ${r.job_context?.contract_type || 'Not specified'}

JOB SUMMARY: ${r.job_summary || ''}

CANDIDATE STRENGTHS (from CV analysis):
${(r.interview_prep?.your_edges || []).map(e => '- ' + e).join('\n') || '- Strong technical skills'}

KEYWORDS TO NATURALLY INCLUDE:
${(r.keyword_match?.found || []).slice(0, 8).join(', ') || 'relevant skills'}

CRITICAL GAPS TO ADDRESS (if any):
${(r.critical_gaps || []).map(g => '- ' + g).join('\n') || '- None'}

INSTRUCTIONS:
- ${langInstruction}
- Tone: ${toneInstruction}
- Length: ${lengthSpec.instruction}
- Structure: ${lengthSpec.structure}
- DO NOT include the salutation (no "Dear X,") or sign-off (no "Best regards" / "Sincerely") — those will be added separately
- Be specific, not generic. Reference the actual job and skills.
- Maximum ${lengthSpec.wordCap} words for the body.
- Return ONLY the paragraphs separated by blank lines. No preamble, no headers, no signature.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: lengthSpec.maxTokens,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    })

    const body = message.content.map(b => b.text || '').join('').trim()
    const salutation = pickSalutation(recipient, lang)
    const signOff = (SIGN_OFFS[tone] || SIGN_OFFS.professional)[lang] || (SIGN_OFFS[tone] || SIGN_OFFS.professional).en
    const name = (fullName && fullName.trim()) ? fullName.trim() : ''
    const letter = `${salutation}\n\n${body}\n\n${signOff},\n${name}`.trim()

    return res.status(200).json({ success: true, letter, salutation, signOff, body, usage })
  } catch (e) {
    console.error('Cover letter error:', e.message)
    return res.status(500).json({ error: e.message || 'Failed to generate cover letter' })
  }
}
