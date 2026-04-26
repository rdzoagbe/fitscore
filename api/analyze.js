import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an expert recruiter, ATS specialist, and job market analyst with 15+ years of experience. You evaluate CV-to-job-offer fit honestly and identify red flags in job postings.

Analyze the CV against the job offer and return ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "job_context": {
    "title": "<exact job title>",
    "company": "<company/employer name, or 'Not specified'>",
    "location": "<city, country, or 'Remote' or 'Not specified'>",
    "work_mode": "<one of: 'remote' | 'hybrid' | 'onsite' | 'unknown'>",
    "contract_type": "<one of: 'CDI' | 'CDD' | 'freelance' | 'internship' | 'apprenticeship' | 'temp' | 'unknown'>",
    "salary_range": "<exact salary mentioned with currency, or 'Not specified'>",
    "experience_required": "<e.g. '3-5 years' or 'Junior' or 'Senior' or 'Not specified'>",
    "posted_date": "<date if mentioned, else 'Unknown'>",
    "languages_required": ["language1", "language2"]
  },
  "job_summary": "<2-sentence punchy summary of the role>",
  "match_probability": <integer 0-100 — your honest estimate of interview chances>,
  "match_reasoning": "<one sentence explaining the probability>",
  "red_flags": [
    "<job posting red flag if any: vague description, unrealistic requirements, no salary, ghost job patterns, etc. Max 3. Empty array if none.>"
  ],
  "salary_assessment": {
    "specified": <true|false>,
    "assessment": "<one of: 'below_market' | 'market' | 'above_market' | 'unknown' | 'not_specified'>",
    "comment": "<brief honest comment about the salary>"
  },
  "verdict": "<one honest sentence verdict, max 12 words>",
  "keyword_match": {
    "score": <0-100>,
    "found": ["exact keywords from job offer found verbatim in CV, max 10"],
    "missing_required": ["critical required keywords completely absent from CV, max 6"],
    "missing_nice": ["nice-to-have keywords absent from CV, max 4"]
  },
  "requirements_check": {
    "score": <0-100>,
    "met": ["specific requirements the candidate meets, max 5"],
    "unmet": ["specific requirements the candidate does NOT meet, max 4"]
  },
  "format_warnings": ["<ATS formatting issue if any, max 3. Empty array if clean.>"],
  "critical_gaps": ["<things that would DEFINITELY get this CV auto-filtered. Max 3. Empty array if none.>"],
  "quick_wins": ["<specific 1-sentence fix. Max 4. Be concrete.>"],
  "overall_verdict": "<one of: 'likely_filtered' | 'borderline' | 'likely_passed'>",
  "overall_reason": "<one sentence explaining the overall verdict>"
}

Rules:
- Extract job_context fields from the actual job offer text. Never invent data — use 'Not specified' or 'unknown' when info is missing.
- match_probability differs from ATS score: it's your holistic gut check including soft fit.
- red_flags should call out: vague responsibilities, missing salary, "rockstar/ninja" buzzwords, unrealistic requirement combos, expired postings.
- salary_assessment: be honest — if salary is missing, that's a yellow flag in the EU job market.`

async function fetchJobText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    }
  })
  if (!res.ok) throw new Error(`Could not fetch job page (${res.status}). Try Indeed or Welcome to the Jungle instead.`)
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ').trim()
  if (text.length < 100) throw new Error('Could not extract text from this page. Try Indeed or Welcome to the Jungle instead.')
  return text.slice(0, 8000)
}

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
    const { jobUrl, cvBase64, cvMimeType, userId, cvFileName } = req.body
    if (!jobUrl || !cvBase64 || !cvMimeType) return res.status(400).json({ error: 'Missing required fields' })

    const [jobText, cvText] = await Promise.all([
      fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract text from your CV. Make sure it is not a scanned image.' })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB OFFER:\n${jobText}\n\n---\n\nCV:\n${cvText}` }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(raw)
    analysis.display_score = Math.round((analysis.keyword_match.score * 0.6) + (analysis.requirements_check.score * 0.4))
    analysis.job_url = jobUrl
    analysis.job_title = analysis.job_context?.title || analysis.job_title || null

    // Try save (best effort)
    try {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (userId && url && key) {
        const supabase = createClient(url, key, { auth: { persistSession: false } })
        await supabase.from('analyses').insert({
          user_id: userId,
          job_url: jobUrl,
          job_title: analysis.job_context?.title || null,
          score: analysis.display_score,
          result: analysis,
          cv_file_path: null,
          cv_file_name: cvFileName || null
        })
      }
    } catch (e) { console.log('Save failed:', e.message) }

    return res.status(200).json({ success: true, analysis })
  } catch (e) {
    console.error('Handler error:', e.message)
    return res.status(500).json({ error: e.message || 'Analysis failed' })
  }
}
