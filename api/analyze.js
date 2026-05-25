import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import crypto from 'crypto'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are Joblytics ATS Intelligence Fast Mode.

Return ONLY valid JSON. No markdown. No commentary.

Analyze the candidate CV against the job offer and produce a practical jobseeker decision.

Rules:
- Be honest and specific.
- Do not invent experience.
- Prefer concise arrays and short explanations.
- Use the language of the job post where possible.
- Scores must be 0-100.

Return JSON with these keys:
{
  "job_context": {
    "title": "job title or Not specified",
    "company": "company or Not specified",
    "location": "location or Not specified",
    "work_mode": "remote|hybrid|onsite|unknown",
    "contract_type": "CDI|CDD|freelance|internship|apprenticeship|temp|unknown",
    "salary_range": "salary or Not specified",
    "experience_required": "experience or Not specified",
    "languages_required": [],
    "apply_url": null,
    "easy_apply": false,
    "hiring_contact": null
  },
  "job_summary": "2 sentences max",
  "match_probability": 0,
  "match_reasoning": "one sentence",
  "display_score": 0,
  "recruiter_shortlist": {
    "probability": 0,
    "verdict": "strong_shortlist|possible_shortlist|unlikely_shortlist",
    "reason": "short reason",
    "top_screening_factors": [],
    "likely_recruiter_concerns": []
  },
  "next_best_action": {
    "action": "apply_now|improve_cv_first|prepare_interview|ask_recruiter_question|skip_or_low_priority",
    "label": "short label",
    "reason": "specific reason",
    "steps": []
  },
  "confidence": {
    "level": "high|medium|low",
    "score": 0,
    "reasons": [],
    "job_text_quality": "complete|partial|thin|blocked",
    "cv_text_quality": "complete|partial|thin|scanned_or_poor"
  },
  "seniority": {
    "candidate_level": "intern|junior|mid|senior|lead|staff_principal|executive",
    "job_level": "intern|junior|mid|senior|lead|staff_principal|executive",
    "alignment": "right_level|stretch|reach|below_level|pivot",
    "alignment_label": "short label",
    "alignment_reason": "one sentence",
    "candidate_years": 0,
    "job_years_required": 0
  },
  "keyword_match": {
    "score": 0,
    "found": [],
    "missing_required": [],
    "missing_nice": [],
    "keyword_stuffing_risk": "low|medium|high"
  },
  "requirements_check": {
    "score": 0,
    "must_have": [],
    "nice_to_have": [],
    "met": [],
    "unmet": []
  },
  "semantic_fit": {
    "score": 0,
    "matched_responsibilities": [],
    "weak_or_missing_responsibilities": [],
    "domain_fit": "strong|moderate|weak",
    "domain_reason": "one sentence"
  },
  "seniority_fit": { "score": 0, "risk": "none|slight_stretch|overqualified|underqualified|track_mismatch" },
  "experience_depth": {
    "score": 0,
    "hands_on": "strong|moderate|weak|unclear",
    "leadership": "strong|moderate|weak|not_required|unclear",
    "scale": "strong|moderate|weak|unclear",
    "metrics": "strong|moderate|weak|missing",
    "ownership": "strong|moderate|weak|unclear",
    "proof_summary": "one sentence"
  },
  "proof_gaps": [],
  "hidden_expectations": [],
  "red_flags": [],
  "salary_assessment": { "specified": false, "assessment": "below_market|market|above_market|unknown|not_specified", "comment": "brief" },
  "salary_intelligence": null,
  "verdict": "max 12 words",
  "overall_verdict": "likely_filtered|borderline|likely_passed",
  "overall_reason": "one sentence",
  "critical_gaps": [],
  "format_warnings": [],
  "quick_wins": [],
  "rewrite_priorities": [],
  "jobseeker_strategy": {
    "apply_message_angle": "short positioning angle",
    "follow_up_timing": "short timing",
    "questions_to_ask_recruiter": [],
    "skip_reason": null
  },
  "interview_prep": {
    "show_prep": true,
    "likely_questions": [],
    "your_edges": [],
    "weak_spots": [],
    "salary_negotiation_hint": "one sentence"
  }
}`

function getRestrictedBoardName(url = '') {
  const lower = String(url).toLowerCase()
  if (lower.includes('linkedin.')) return 'LinkedIn'
  if (lower.includes('indeed.')) return 'Indeed'
  if (lower.includes('glassdoor.')) return 'Glassdoor'
  if (lower.includes('welcometothejungle.com')) return 'Welcome to the Jungle'
  if (lower.includes('builtin.com') || lower.includes('built-in.com')) return 'Built In'
  return null
}

async function fetchJobText(url) {
  const restrictedBoard = getRestrictedBoardName(url)

  let res
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6500)

    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    })

    clearTimeout(timeout)
  } catch {
    const err = new Error(`${restrictedBoard || 'This job page'} could not be reached quickly from URL mode. Please use Mode texte and paste the job description.`)
    err.statusCode = 400
    err.code = 'URL_FETCH_FAILED'
    throw err
  }
  if (!res.ok) {
    const err = new Error(`${restrictedBoard || 'This job page'} returned ${res.status}. Paste mode is available as a fallback.`)
    err.statusCode = 400
    err.code = restrictedBoard ? 'RESTRICTED_JOB_BOARD' : 'URL_FETCH_FAILED'
    throw err
  }
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ').trim()
  if (text.length < 200) {
    const err = new Error(`${restrictedBoard || 'This job page'} did not expose enough readable job text through URL mode. Joblytics tried to read the page but the job description was hidden, blocked, or loaded dynamically. Use Mode texte for this specific page.`)
    err.statusCode = 400
    err.code = 'URL_TEXT_TOO_SHORT'
    throw err
  }
  return text.slice(0, 5500)
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

const WHITELIST = (process.env.RATE_LIMIT_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
const HOURLY_LIMIT = 15
const DAILY_LIMIT = 50
const WHITELIST_DAILY = 500

async function checkRateLimit(supabase, userId) {
  if (!supabase || !userId) return { allowed: true, dayCount: 0, dayLimit: DAILY_LIMIT }
  const isWhitelisted = WHITELIST.includes(userId)
  const dayLimit = isWhitelisted ? WHITELIST_DAILY : DAILY_LIMIT
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: hourCount } = await supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', oneHourAgo)
  if (!isWhitelisted && (hourCount ?? 0) >= HOURLY_LIMIT) return { allowed: false, reason: 'hourly', message: `Hourly limit reached (${HOURLY_LIMIT} analyses/hour). Please try again later.`, dayCount: 0, dayLimit }
  const { count: dayCount } = await supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', oneDayAgo)
  if ((dayCount ?? 0) >= dayLimit) return { allowed: false, reason: 'daily', message: `Daily limit reached (${dayLimit} analyses/day). Please try again tomorrow.`, dayCount: dayCount ?? 0, dayLimit }
  return { allowed: true, dayCount: dayCount ?? 0, dayLimit }
}

function safeScore(val, fallback = 0) {
  const n = typeof val === 'number' ? val : parseInt(val, 10)
  if (Number.isNaN(n) || n < 0 || n > 100) return fallback
  return Math.round(n)
}

function arr(value, limit = 10) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, limit) : []
}

function obj(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
}

function normalizeAnalysis(analysis, jobUrl, cvText) {
  if (!analysis || typeof analysis !== 'object') throw new Error('AI returned an unexpected response. Please try again.')

  analysis.keyword_match = obj(analysis.keyword_match, {})
  analysis.requirements_check = obj(analysis.requirements_check, {})
  analysis.semantic_fit = obj(analysis.semantic_fit, {})
  analysis.seniority_fit = obj(analysis.seniority_fit, {})
  analysis.experience_depth = obj(analysis.experience_depth, {})
  analysis.recruiter_shortlist = obj(analysis.recruiter_shortlist, {})
  analysis.next_best_action = obj(analysis.next_best_action, {})
  analysis.confidence = obj(analysis.confidence, {})
  analysis.seniority = obj(analysis.seniority, {})

  analysis.keyword_match.score = safeScore(analysis.keyword_match.score, 0)
  analysis.requirements_check.score = safeScore(analysis.requirements_check.score, 0)
  analysis.semantic_fit.score = safeScore(analysis.semantic_fit.score, Math.round((analysis.keyword_match.score + analysis.requirements_check.score) / 2))
  analysis.seniority_fit.score = safeScore(analysis.seniority_fit.score, 60)
  analysis.experience_depth.score = safeScore(analysis.experience_depth.score, 50)
  analysis.recruiter_shortlist.probability = safeScore(analysis.recruiter_shortlist.probability, analysis.match_probability || 0)
  analysis.confidence.score = safeScore(analysis.confidence.score, 70)

  analysis.display_score = safeScore(analysis.display_score, Math.round(
    analysis.keyword_match.score * 0.25 +
    analysis.requirements_check.score * 0.25 +
    analysis.semantic_fit.score * 0.2 +
    analysis.seniority_fit.score * 0.15 +
    analysis.experience_depth.score * 0.15
  ))
  analysis.match_probability = safeScore(analysis.match_probability, analysis.recruiter_shortlist.probability || analysis.display_score)

  analysis.keyword_match.found = arr(analysis.keyword_match.found, 10)
  analysis.keyword_match.missing_required = arr(analysis.keyword_match.missing_required, 8)
  analysis.keyword_match.missing_nice = arr(analysis.keyword_match.missing_nice, 6)
  analysis.requirements_check.must_have = arr(analysis.requirements_check.must_have, 12)
  analysis.requirements_check.nice_to_have = arr(analysis.requirements_check.nice_to_have, 10)
  analysis.requirements_check.met = arr(analysis.requirements_check.met, 6)
  analysis.requirements_check.unmet = arr(analysis.requirements_check.unmet, 6)
  analysis.semantic_fit.matched_responsibilities = arr(analysis.semantic_fit.matched_responsibilities, 6)
  analysis.semantic_fit.weak_or_missing_responsibilities = arr(analysis.semantic_fit.weak_or_missing_responsibilities, 6)
  analysis.proof_gaps = arr(analysis.proof_gaps, 6)
  analysis.hidden_expectations = arr(analysis.hidden_expectations, 6)
  analysis.red_flags = arr(analysis.red_flags, 4)
  analysis.critical_gaps = arr(analysis.critical_gaps, 4)
  analysis.format_warnings = arr(analysis.format_warnings, 3)
  analysis.quick_wins = arr(analysis.quick_wins, 5)
  analysis.rewrite_priorities = arr(analysis.rewrite_priorities, 6)
  analysis.recruiter_shortlist.top_screening_factors = arr(analysis.recruiter_shortlist.top_screening_factors, 5)
  analysis.recruiter_shortlist.likely_recruiter_concerns = arr(analysis.recruiter_shortlist.likely_recruiter_concerns, 5)
  analysis.next_best_action.steps = arr(analysis.next_best_action.steps, 4)
  analysis.confidence.reasons = arr(analysis.confidence.reasons, 4)

  if (!['high', 'medium', 'low'].includes(analysis.confidence.level)) analysis.confidence.level = analysis.confidence.score >= 80 ? 'high' : analysis.confidence.score >= 55 ? 'medium' : 'low'
  if (!['strong_shortlist', 'possible_shortlist', 'unlikely_shortlist'].includes(analysis.recruiter_shortlist.verdict)) {
    analysis.recruiter_shortlist.verdict = analysis.recruiter_shortlist.probability >= 75 ? 'strong_shortlist' : analysis.recruiter_shortlist.probability >= 50 ? 'possible_shortlist' : 'unlikely_shortlist'
  }
  if (!['apply_now', 'improve_cv_first', 'prepare_interview', 'ask_recruiter_question', 'skip_or_low_priority'].includes(analysis.next_best_action.action)) {
    analysis.next_best_action.action = analysis.display_score >= 78 ? 'apply_now' : analysis.display_score >= 55 ? 'improve_cv_first' : 'skip_or_low_priority'
  }

  if (!analysis.overall_verdict) {
    analysis.overall_verdict = analysis.display_score >= 75 ? 'likely_passed' : analysis.display_score >= 50 ? 'borderline' : 'likely_filtered'
  }

  const si = obj(analysis.salary_intelligence, null)
  if (si) {
    const safeNum = v => {
      const n = typeof v === 'number' ? v : parseFloat(v)
      return Number.isNaN(n) || n <= 0 ? null : Math.round(n)
    }
    si.posted_low = safeNum(si.posted_low)
    si.posted_high = safeNum(si.posted_high)
    si.estimated_market_low = safeNum(si.estimated_market_low)
    si.estimated_market_high = safeNum(si.estimated_market_high)
    si.target_low = safeNum(si.target_low)
    si.target_high = safeNum(si.target_high)
    si.leverage_points = arr(si.leverage_points, 3)
    si.currency = typeof si.currency === 'string' && si.currency.length >= 3 ? si.currency.toUpperCase().slice(0, 3) : 'EUR'
    si.confidence = ['high', 'medium', 'low'].includes(si.confidence) ? si.confidence : 'medium'
    si.scenario = ['salary_mentioned', 'salary_hidden'].includes(si.scenario) ? si.scenario : (si.posted_low ? 'salary_mentioned' : 'salary_hidden')
    analysis.salary_intelligence = si.target_low && si.target_high ? si : null
  } else {
    analysis.salary_intelligence = null
  }

  analysis.job_url = jobUrl || null
  analysis.job_source = jobUrl ? 'url' : 'pasted'
  analysis.job_title = analysis.job_context?.title || null
  analysis.cv_preview = cvText.trim().slice(0, 800).replace(/\s+/g, ' ').trim()
  analysis.cv_preview_truncated = cvText.trim().length > 800
  analysis.analysis_version = 'ats-intelligence-v2'
  return analysis
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { jobUrl, jobText: providedJobText, cvBase64, cvMimeType, userId, cvFileName } = req.body
    if ((!jobUrl && !providedJobText) || !cvBase64 || !cvMimeType) return res.status(400).json({ error: 'Missing required fields' })

    let supabaseClient = null
    try {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (url && key) supabaseClient = createClient(url, key, { auth: { persistSession: false } })
    } catch {}

    let rateLimitInfo = { dayCount: 0, dayLimit: DAILY_LIMIT }
    if (supabaseClient && userId) {
      const rl = await checkRateLimit(supabaseClient, userId)
      rateLimitInfo = { dayCount: rl.dayCount, dayLimit: rl.dayLimit }
      if (!rl.allowed) return res.status(429).json({ error: rl.message, rate_limited: true, reason: rl.reason })
    }

    const [jobText, cvText] = await Promise.all([
      providedJobText ? Promise.resolve(providedJobText.slice(0, 5500)) : fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])

    if (!cvText || cvText.trim().length < 50) return res.status(400).json({ error: 'Could not extract text from your CV. Make sure it is not a scanned image.' })
    if (!jobText || jobText.trim().length < 100) return res.status(400).json({ error: 'The job description is too short. Please paste at least 100 characters of the actual job posting.' })

    const cacheKey = hashContent('ats-v2', cvText.slice(0, 6000), jobText.slice(0, 6000))
    if (supabaseClient && userId) {
      const { data: cached } = await supabaseClient.from('analyses').select('result, created_at').eq('user_id', userId).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).single()
      if (cached?.result) return res.status(200).json({ success: true, analysis: cached.result, cached: true })
    }

    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB OFFER:\n${jobText.slice(0, 5500)}\n\n---\n\nCV:\n${cvText.slice(0, 5500)}` }]
    }, { timeout: 9000 })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
    let analysis
    try {
      analysis = JSON.parse(raw)
    } catch {
      console.error('JSON parse failed. Raw output first 700:', raw.slice(0, 700))
      throw new Error('AI returned malformed JSON. This is usually transient — please try again.')
    }

    analysis = normalizeAnalysis(analysis, jobUrl, cvText)

    let savedRow = null
    try {
      if (supabaseClient && userId) {
        const { data: existing } = await supabaseClient.from('analyses').select('id, application_status, status_updated_at').eq('user_id', userId).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (existing) {
          const { data: updated } = await supabaseClient.from('analyses').update({ job_url: jobUrl || 'manual_paste', job_title: analysis.job_context?.title || null, score: analysis.display_score, result: analysis, cv_file_name: cvFileName || null }).eq('id', existing.id).select().single()
          savedRow = updated
        } else {
          const { data: inserted } = await supabaseClient.from('analyses').insert({ user_id: userId, job_url: jobUrl || 'manual_paste', job_title: analysis.job_context?.title || null, score: analysis.display_score, result: analysis, cv_file_path: null, cv_file_name: cvFileName || null, cache_key: cacheKey }).select().single()
          savedRow = inserted
        }
      }
    } catch (e) {
      console.log('Save failed:', e.message)
    }

    return res.status(200).json({ success: true, analysis, savedRow, rateLimit: rateLimitInfo })
  } catch (e) {
    console.error('Handler error:', e.message)
    if (e.name === 'APIConnectionTimeoutError' || e.code === 'ETIMEDOUT' || /timeout/i.test(e.message)) {
      return res.status(504).json({ error: 'Analysis is taking too long. Please try again — this is usually a one-off slowdown.', code: 'ANALYSIS_TIMEOUT' })
    }
    const statusCode = e.statusCode || 500
    return res.status(statusCode).json({ error: e.message || 'Analysis failed', code: e.code || 'ANALYSIS_FAILED' })
  }
}
