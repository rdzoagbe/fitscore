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
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return res.status(204).end()
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })

  try {
    const { cvBase64, cvMimeType, jobDescription, lang = 'en' } = req.body

    if (!cvBase64 || !cvMimeType) {
      return res.status(400).json({ error: 'Missing CV file. Please upload your CV.' })
    }
    if (!jobDescription || jobDescription.trim().length < 80) {
      return res.status(400).json({ error: 'Please paste the full job description (at least 80 characters).' })
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

    const langInstruction = {
      en: 'All output must be in English.',
      fr: 'Toute la sortie doit être en français.',
      es: 'Toda la salida debe estar en español.',
      de: 'Alle Ausgaben müssen auf Deutsch sein.',
      it: 'Tutto l\'output deve essere in italiano.',
      pt: 'Todo o output deve estar em português.',
      nl: 'Alle uitvoer moet in het Nederlands zijn.',
      ar: 'يجب أن يكون جميع المخرجات باللغة العربية.'
    }[lang] || 'All output must be in English.'

    const prompt = `You are a senior CV writer and career coach. Your task is to completely rewrite the user's CV so it is maximally tailored to the job description below.

RULES:
- Do NOT invent experience, qualifications, or skills not present in the original CV
- You MAY reword, restructure, and reframe existing content powerfully
- Use strong action verbs, measurable results where implied, and relevant keywords from the job description
- Reorder sections and bullets to prioritize what is most relevant to this role
- Write a brand-new professional summary specifically crafted for this job
- Limit experience to 5 most relevant positions; limit bullets to the 3-5 strongest per role
- ${langInstruction}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

ORIGINAL CV:
${cvText.slice(0, 5000)}

Return ONLY valid JSON with no preamble or markdown code fences:
{
  "header": {
    "full_name": "<name from CV>",
    "title": "<professional title matched to target role>",
    "contact": {
      "email": "<from CV or empty>",
      "phone": "<from CV or empty>",
      "location": "<from CV or empty>",
      "linkedin": "<from CV or empty>"
    }
  },
  "summary": "<4-5 sentence executive summary tailored to this exact role, incorporating relevant keywords>",
  "experience": [
    {
      "title": "<job title from CV>",
      "company": "<company from CV>",
      "location": "<if available>",
      "dates": "<dates as on CV>",
      "bullets": [
        "<Powerful bullet: Action verb + specific achievement + measurable outcome where possible>",
        "<2nd bullet>",
        "<3rd bullet — max 5 per role>"
      ]
    }
  ],
  "skills": {
    "technical": ["<skill>"],
    "soft": ["<skill>"],
    "languages": ["<language: level>"]
  },
  "education": [
    {
      "degree": "<degree>",
      "institution": "<school>",
      "location": "<if available>",
      "dates": "<years>"
    }
  ],
  "certifications": ["<cert if any, empty array if none>"],
  "keywords_added": ["<job-description keywords naturally integrated into the CV>"],
  "changes_summary": [
    "<key change 1 — what was rewritten and why>",
    "<key change 2>",
    "<key change 3>"
  ],
  "disclaimer": "<one sentence reminding the user to verify accuracy before sending, in the output language>"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json\s*|```/g, '').trim()

    let rewritten
    try {
      rewritten = JSON.parse(raw)
    } catch (parseErr) {
      console.error('Parse error:', parseErr.message, 'Raw:', raw.slice(0, 500))
      return res.status(500).json({ error: 'Could not parse the rewritten CV. Please try again.' })
    }

    rewritten.header = rewritten.header || { full_name: '', title: '', contact: {} }
    rewritten.header.contact = rewritten.header.contact || {}
    rewritten.summary = rewritten.summary || ''
    rewritten.experience = Array.isArray(rewritten.experience) ? rewritten.experience.slice(0, 5) : []
    rewritten.skills = rewritten.skills || { technical: [], soft: [], languages: [] }
    rewritten.education = Array.isArray(rewritten.education) ? rewritten.education : []
    rewritten.certifications = Array.isArray(rewritten.certifications) ? rewritten.certifications : []
    rewritten.keywords_added = Array.isArray(rewritten.keywords_added) ? rewritten.keywords_added : []
    rewritten.changes_summary = Array.isArray(rewritten.changes_summary) ? rewritten.changes_summary.slice(0, 6) : []
    rewritten.disclaimer = rewritten.disclaimer || 'Please review and verify all content before submitting.'

    return res.status(200).json({ success: true, rewritten })
  } catch (e) {
    console.error('CV rewrite error:', e.message)
    return res.status(500).json({ error: e.message || 'Failed to rewrite CV. Please try again.' })
  }
}
