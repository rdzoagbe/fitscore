import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractCvText(base64Data, mimeType) {
  const buffer = Buffer.from(base64Data, 'base64')
  if (mimeType === 'application/pdf') return (await pdfParse(buffer)).text
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return (await mammoth.extractRawText({ buffer })).value
  throw new Error('Unsupported file type. Please upload a PDF or Word document.')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { cvBase64, cvMimeType, analysis, lang = 'en' } = req.body

    if (!cvBase64 || !cvMimeType) {
      return res.status(400).json({ error: 'Missing CV file. Please upload your CV first.' })
    }
    if (!analysis?.job_context) {
      return res.status(400).json({ error: 'Missing analysis context. Please run an analysis first.' })
    }

    let cvText
    try {
      cvText = await extractCvText(cvBase64, cvMimeType)
    } catch (extractErr) {
      return res.status(400).json({ error: extractErr.message || 'Could not read CV file.' })
    }

    if (!cvText || cvText.trim().length < 100) {
      return res.status(400).json({ error: 'CV text is too short or could not be extracted. Make sure your CV is not a scanned image.' })
    }

    const r = analysis
    const langInstruction = {
      en: 'All output must be in English.',
      fr: 'Toute la sortie doit être en français.',
      es: 'Toda la salida debe estar en español.',
      de: 'Alle Ausgaben müssen auf Deutsch sein.',
      it: 'Tutto l\'output deve essere in italiano.',
      pt: 'Todo o output deve estar em português.'
    }[lang] || 'All output must be in English.'

    const missingKeywords = (r.keyword_match?.missing || []).slice(0, 12)
    const foundKeywords = (r.keyword_match?.found || []).slice(0, 12)
    const criticalGaps = (r.critical_gaps || []).slice(0, 5)

    const prompt = `You are a senior career coach helping a job seeker optimize their CV for a specific job. You must NOT fabricate or invent experience that isn't in the original CV. You may only:
- Reword existing experience using more impactful language
- Reorganize sections to put the most job-relevant content first
- Emphasize keywords from the job posting that are already present (or could be naturally inferred)
- Suggest where to add specific skills the user likely has but didn't mention
- Quantify achievements where the user implied numbers

Return a STRUCTURED JSON object with these exact fields. ${langInstruction}

JOB CONTEXT:
Title: ${r.job_context?.title || 'Position'}
Company: ${r.job_context?.company || 'Not specified'}
Required keywords (already in CV): ${foundKeywords.join(', ') || 'none extracted'}
Missing keywords (try to integrate where truthful): ${missingKeywords.join(', ') || 'none'}
Critical gaps to address: ${criticalGaps.join('; ') || 'none'}

ORIGINAL CV:
${cvText.slice(0, 6000)}

OUTPUT FORMAT — return ONLY this JSON, no preamble, no markdown:
{
  "header": {
    "full_name": "<name from CV or 'Your Name' if not found>",
    "title": "<professional title aligned with target role>",
    "contact": {
      "email": "<email from CV or empty>",
      "phone": "<phone from CV or empty>",
      "location": "<city/country from CV or empty>",
      "linkedin": "<linkedin URL from CV or empty>"
    }
  },
  "summary": "<3-4 sentence professional summary specifically tailored to the target role. Use found keywords naturally. Highlight strongest matching experience.>",
  "experience": [
    {
      "title": "<job title from CV>",
      "company": "<company from CV>",
      "location": "<city/country if available>",
      "dates": "<start - end dates as on CV>",
      "bullets": [
        "<bullet 1 — action verb + what + measurable outcome. Optimize wording but stay truthful.>",
        "<bullet 2>",
        "<bullet 3 max — keep most relevant only>"
      ]
    }
  ],
  "skills": {
    "technical": ["<skill 1>", "<skill 2>", "..."],
    "soft": ["<skill 1>", "<skill 2>", "..."],
    "languages": ["<language: level>"]
  },
  "education": [
    {
      "degree": "<degree name>",
      "institution": "<school name>",
      "location": "<location if available>",
      "dates": "<years>"
    }
  ],
  "changes_made": [
    "<short summary of change 1, e.g. 'Moved cloud experience to top — most relevant for this role'>",
    "<short summary of change 2, e.g. 'Reframed team-lead experience using impact metrics'>",
    "<short summary of change 3>"
  ],
  "honest_disclaimer": "<one short sentence reminding the user to verify and edit before sending — should match the language>"
}

CRITICAL RULES:
- NEVER invent skills, jobs, or qualifications not present in the original CV
- If a missing keyword cannot be honestly added, do NOT add it
- Keep the original truth — just optimize presentation
- Maximum 5 experiences (most recent + most relevant)
- Maximum 8 technical skills, 5 soft skills`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()

    let optimized
    try {
      optimized = JSON.parse(raw)
    } catch (parseErr) {
      console.error('Parse error:', parseErr.message, 'Raw:', raw.slice(0, 500))
      return res.status(500).json({ error: 'Could not parse the optimized CV. Please try again.' })
    }

    // Defensive defaults
    optimized.header = optimized.header || { full_name: '', title: '', contact: {} }
    optimized.experience = Array.isArray(optimized.experience) ? optimized.experience.slice(0, 5) : []
    optimized.skills = optimized.skills || { technical: [], soft: [], languages: [] }
    optimized.education = Array.isArray(optimized.education) ? optimized.education : []
    optimized.changes_made = Array.isArray(optimized.changes_made) ? optimized.changes_made.slice(0, 5) : []
    optimized.summary = optimized.summary || ''
    optimized.honest_disclaimer = optimized.honest_disclaimer || 'Please review and edit before sending. AI optimizes wording but does not verify facts.'

    return res.status(200).json({ success: true, optimized })
  } catch (e) {
    console.error('CV optimize error:', e.message)
    return res.status(500).json({ error: e.message || 'Failed to optimize CV' })
  }
}
