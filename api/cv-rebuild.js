import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import crypto from 'crypto'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a senior CV writer and ATS optimization specialist.

Your job is to rewrite a candidate CV for ONE specific job while staying strictly faithful to the candidate's real experience.

Rules:
- Do not invent employers, degrees, certifications, tools, dates, metrics, titles, or responsibilities.
- You may reframe, reorder, tighten, and strengthen wording.
- You may naturally include job keywords only when they are supported by the CV or clearly transferable.
- Keep the CV credible, recruiter-friendly, ATS-friendly, and concise.
- Preserve the candidate's career level.
- Return ONLY valid JSON. No markdown. No preamble.

Return this exact JSON shape:
{
  "header": {
    "full_name": "Candidate name if available, else 'Candidate'",
    "title": "Job-aligned professional title",
    "contact": {
      "email": "email if present else null",
      "phone": "phone if present else null",
      "location": "location if present else null",
      "linkedin": "linkedin if present else null"
    }
  },
  "summary": "4-5 line job-aligned professional summary based only on the CV.",
  "experience": [
    {
      "title": "role title",
      "company": "company",
      "location": "location or null",
      "dates": "dates or null",
      "bullets": ["4-6 impact bullets rewritten for the target job"]
    }
  ],
  "skills": {
    "technical": ["supported technical/tool keywords"],
    "soft": ["supported soft skills"],
    "languages": ["languages if present"]
  },
  "education": [
    { "degree": "degree", "institution": "institution", "location": "location or null", "dates": "dates or null" }
  ],
  "changes_made": [
    "specific change made",
    "specific change made",
    "specific change made",
    "specific change made"
  ],
  "score_lift_strategy": [
    "specific way this rewrite improves alignment",
    "specific way this rewrite improves alignment",
    "specific way this rewrite improves alignment"
  ],
  "honest_disclaimer": "Review carefully before sending. This rewrite does not verify facts and does not add unsupported experience."
}`

async function extractCvText(base64Data, mimeType) {
  const buffer = Buffer.from(base64Data, 'base64')
  if (mimeType === 'application/pdf') return (await pdfParse(buffer)).text
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return (await mammoth.extractRawText({ buffer })).value
  throw new Error('Unsupported file type. Please upload a PDF or Word document.')
}

function hashContent(...parts) {
  return crypto.createHash('sha256').update(parts.join('||')).digest('hex')
}

function jsonFromClaude(message) {
  const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizeRebuiltCv(value) {
  const cv = value && typeof value === 'object' ? value : {}
  cv.header = cv.header && typeof cv.header === 'object' ? cv.header : {}
  cv.header.full_name = cv.header.full_name || 'Candidate'
  cv.header.title = cv.header.title || 'Job-aligned candidate profile'
  cv.header.contact = cv.header.contact && typeof cv.header.contact === 'object' ? cv.header.contact : {}
  cv.summary = cv.summary || ''
  cv.experience = safeArray(cv.experience).map(exp => ({
    title: exp?.title || '',
    company: exp?.company || '',
    location: exp?.location || null,
    dates: exp?.dates || null,
    bullets: safeArray(exp?.bullets).slice(0, 6)
  }))
  cv.skills = cv.skills && typeof cv.skills === 'object' ? cv.skills : {}
  cv.skills.technical = safeArray(cv.skills.technical)
  cv.skills.soft = safeArray(cv.skills.soft)
  cv.skills.languages = safeArray(cv.skills.languages)
  cv.education = safeArray(cv.education)
  cv.changes_made = safeArray(cv.changes_made).slice(0, 8)
  cv.score_lift_strategy = safeArray(cv.score_lift_strategy).slice(0, 6)
  cv.honest_disclaimer = cv.honest_disclaimer || 'Review carefully before sending. This rewrite does not verify facts and does not add unsupported experience.'
  return cv
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { cvBase64, cvMimeType, cvFileName, analysis, userId, analysisId } = req.body || {}
    if (!cvBase64 || !cvMimeType || !analysis) return res.status(400).json({ error: 'Missing required fields' })
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Anthropic API key is not configured.' })

    const cvText = await extractCvText(cvBase64, cvMimeType)
    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from your CV. Make sure it is not a scanned image.' })
    }

    const jobContext = analysis.job_context || {}
    const keywordMatch = analysis.keyword_match || {}
    const requirements = analysis.requirements_check || {}
    const quickWins = analysis.quick_wins || []
    const criticalGaps = analysis.critical_gaps || []

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3200,
      temperature: 0.2,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TARGET JOB CONTEXT:\n${JSON.stringify(jobContext).slice(0, 2500)}\n\nANALYSIS GAPS AND KEYWORDS:\n${JSON.stringify({ keywordMatch, requirements, quickWins, criticalGaps }).slice(0, 3500)}\n\nORIGINAL CV TEXT:\n${cvText.slice(0, 9000)}`
      }]
    })

    let rebuilt
    try {
      rebuilt = normalizeRebuiltCv(jsonFromClaude(message))
    } catch (e) {
      console.error('CV rebuild JSON parse failed:', e.message)
      return res.status(500).json({ error: 'AI returned malformed CV JSON. Please try again.' })
    }

    const cacheKey = hashContent(cvText.slice(0, 6000), JSON.stringify(jobContext), JSON.stringify(keywordMatch))
    let savedVersion = null

    try {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (url && key && userId) {
        const supabase = createClient(url, key, { auth: { persistSession: false } })
        const payload = {
          user_id: userId,
          analysis_id: analysisId || null,
          cv_file_name: cvFileName || null,
          job_title: jobContext.title || null,
          company: jobContext.company || null,
          rebuilt_cv: rebuilt,
          cache_key: cacheKey
        }
        const { data, error } = await supabase.from('generated_cvs').insert(payload).select().single()
        if (error) console.log('generated_cvs save skipped:', error.message)
        else savedVersion = data
      }
    } catch (e) {
      console.log('generated_cvs save failed:', e.message)
    }

    return res.status(200).json({ success: true, rebuiltCv: rebuilt, savedVersion })
  } catch (e) {
    console.error('CV rebuild handler error:', e.message)
    return res.status(500).json({ error: e.message || 'CV rebuild failed' })
  }
}
