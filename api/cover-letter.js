import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { analysis, lang = 'en', tone = 'professional' } = req.body
    if (!analysis?.job_context) return res.status(400).json({ error: 'Missing analysis context' })

    const r = analysis
    const langInstruction = {
      en: 'Write the letter in English.',
      fr: 'Rédige la lettre en français.',
      es: 'Escribe la carta en español.',
      de: 'Schreibe den Brief auf Deutsch.',
      it: 'Scrivi la lettera in italiano.',
      pt: 'Escreve a carta em português.'
    }[lang] || 'Write the letter in English.'

    const toneInstruction = {
      professional: 'Confident and professional but not stiff.',
      warm: 'Warm and personable while still professional.',
      formal: 'Highly formal and respectful (suitable for traditional industries).',
      enthusiastic: 'Enthusiastic and energetic, conveying passion for the role.'
    }[tone] || 'Confident and professional but not stiff.'

    const prompt = `Write a professional cover letter for this job application.

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
- Structure: 3 short paragraphs
  - Opening: express genuine interest, mention top qualification
  - Middle: 2-3 specific achievements matching the role requirements
  - Closing: forward-looking call to action
- Do NOT include date, address blocks, salutations like "Dear Hiring Manager", sign-offs like "Sincerely", or placeholders like [Your Name].
- Just the letter body itself.
- Maximum 220 words.
- Be specific, not generic. Reference the actual job and skills.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = message.content.map(b => b.text || '').join('').trim()
    return res.status(200).json({ success: true, letter: text })
  } catch (e) {
    console.error('Cover letter error:', e.message)
    return res.status(500).json({ error: e.message || 'Failed to generate cover letter' })
  }
}
