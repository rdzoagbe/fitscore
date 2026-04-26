import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import crypto from 'crypto'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// DETERMINISTIC scoring rubric — same inputs always produce same output
const SYSTEM = `You are an ATS specialist running a DETERMINISTIC analysis. Same CV + same job MUST always yield the same score.

Apply this RIGID scoring rubric exactly:

KEYWORD MATCH SCORE (0-100):
- Extract ALL technical skills, tools, methodologies, certifications, and domain terms from the job offer (the "required keyword set")
- Count how many appear VERBATIM (case-insensitive) in the CV
- Score = (matched_count / total_required_count) * 100, rounded to nearest integer
- "Required" keywords are those in must-have sections; "nice-to-have" are bonus and counted at half weight

REQUIREMENTS MATCH SCORE (0-100):
- Identify ALL hard requirements (years of experience, education, certifications, language fluency, location, work authorization)
- For each, score 100 if met, 50 if partially met, 0 if absent
- Score = average of all hard requirements

OVERALL VERDICT:
- "likely_passed" if BOTH keyword_match.score >= 70 AND requirements_check.score >= 70 AND no critical_gaps
- "borderline" if keyword_match.score >= 50 AND requirements_check.score >= 50
- "likely_filtered" otherwise

MATCH PROBABILITY (0-100):
- Based STRICTLY on: (display_score * 0.5) + (requirements_score * 0.5) - (10 * critical_gaps_count)
- Bounded 0-100

Return ONLY a JSON object — no markdown, no preamble:

{
  "job_context": {
    "title": "<exact job title from offer>",
    "company": "<company name, or 'Not specified'>",
    "location": "<city, country, or 'Remote' or 'Not specified'>",
    "work_mode": "<remote | hybrid | onsite | unknown>",
    "contract_type": "<CDI | CDD | freelance | internship | apprenticeship | temp | unknown>",
    "salary_range": "<exact salary with currency, or 'Not specified'>",
    "experience_required": "<e.g. '3-5 years' or 'Not specified'>",
    "posted_date": "<date or 'Unknown'>",
    "languages_required": ["language1"]
  },
  "job_summary": "<2 sentences max>",
  "match_probability": <integer 0-100, computed by formula above>,
  "match_reasoning": "<one sentence>",
  "red_flags": ["<posting red flag if any, max 3>"],
  "salary_assessment": {
    "specified": <true|false>,
    "assessment": "<below_market | market | above_market | unknown | not_specified>",
    "comment": "<brief>"
  },
  "verdict": "<one sentence, max 12 words>",
  "keyword_match": {
    "score": <0-100, computed by rubric>,
    "found": ["max 10 keywords found verbatim in CV"],
    "missing_required": ["max 6 critical missing keywords"],
    "missing_nice": ["max 4 nice-to-have missing"]
  },
  "requirements_check": {
    "score": <0-100, computed by rubric>,
    "met": ["max 5 requirements met"],
    "unmet": ["max 4 requirements not met"]
  },
  "format_warnings": ["<max 3, empty if clean>"],
  "critical_gaps": ["<max 3, empty if none>"],
  "quick_wins": ["<exactly 4 specific copy-paste-ready fixes>"],
  "overall_verdict": "<likely_filtered | borderline | likely_passed>",
  "overall_reason": "<one sentence>"
}

CRITICAL: Apply the rubric mechanically. Do not introduce subjective judgment. Same input = same output.`

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

function hashContent(...parts) {
  return crypto.createHash('sha256').update(parts.join('||')).digest('hex')
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

    // CACHE: same CV + same job URL = same result (deterministic)
    const cacheKey = hashContent(cvText.slice(0, 4000), jobText.slice(0, 4000))
    let supabaseClient = null
    try {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (url && key) supabaseClient = createClient(url, key, { auth: { persistSession: false } })
    } catch {}

    if (supabaseClient && userId) {
      const { data: cached } = await supabaseClient
        .from('analyses')
        .select('result, created_at')
        .eq('user_id', userId)
        .eq('cache_key', cacheKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (cached?.result) {
        console.log('Cache hit — returning identical result')
        return res.status(200).json({ success: true, analysis: cached.result, cached: true })
      }
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0, // DETERMINISTIC
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB OFFER:\n${jobText}\n\n---\n\nCV:\n${cvText}` }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(raw)
    analysis.display_score = Math.round((analysis.keyword_match.score * 0.6) + (analysis.requirements_check.score * 0.4))
    analysis.job_url = jobUrl
    analysis.job_title = analysis.job_context?.title || null

    // Save with cache_key for deduplication
    try {
      if (supabaseClient && userId) {
        await supabaseClient.from('analyses').insert({
          user_id: userId,
          job_url: jobUrl,
          job_title: analysis.job_context?.title || null,
          score: analysis.display_score,
          result: analysis,
          cv_file_path: null,
          cv_file_name: cvFileName || null,
          cache_key: cacheKey
        })
      }
    } catch (e) { console.log('Save failed:', e.message) }

    return res.status(200).json({ success: true, analysis })
  } catch (e) {
    console.error('Handler error:', e.message)
    return res.status(500).json({ error: e.message || 'Analysis failed' })
  }
}
