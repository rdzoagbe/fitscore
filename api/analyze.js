import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import crypto from 'crypto'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an ATS specialist, recruiter, and career coach with 15+ years of experience. You run DETERMINISTIC analyses — same CV + same job MUST always yield the same scores.

Apply this RIGID scoring rubric exactly:

KEYWORD MATCH SCORE (0-100):
- Extract ALL technical skills, tools, methodologies, certifications, and domain terms from the job offer (the "required keyword set")
- Count how many appear VERBATIM (case-insensitive) in the CV
- Score = (matched_count / total_required_count) * 100, rounded to nearest integer

REQUIREMENTS MATCH SCORE (0-100):
- Identify ALL hard requirements (years of experience, education, certifications, language fluency, location, work authorization)
- For each, score 100 if met, 50 if partially met, 0 if absent
- Score = average of all hard requirements

OVERALL VERDICT:
- "likely_passed" if BOTH keyword_match.score >= 70 AND requirements_check.score >= 70 AND no critical_gaps
- "borderline" if keyword_match.score >= 50 AND requirements_check.score >= 50
- "likely_filtered" otherwise

MATCH PROBABILITY (0-100):
- Formula: (display_score * 0.5) + (requirements_score * 0.5) - (10 * critical_gaps_count), bounded 0-100

SENIORITY ALIGNMENT:
- Extract candidate_level from CV: count years of relevant experience + assess role progression
- candidate_level values: "intern" | "junior" (0-2y) | "mid" (3-5y) | "senior" (6-9y) | "lead" (8-12y, with leadership) | "staff_principal" (10+y, scope) | "executive" (director+)
- Extract job_level from job offer same way (look at title + required years + responsibilities)
- alignment values:
  - "right_level" — same level
  - "stretch" — job is 1 level above candidate (worth applying, ambitious fit)
  - "reach" — job is 2+ levels above (apply only with strong edge cases)
  - "below_level" — candidate is 1+ levels above job (likely overqualified, flight risk)
  - "pivot" — different career track entirely (e.g. IC vs management, different domain)

Return ONLY a JSON object — no markdown, no preamble:

{
  "job_context": {
    "title": "<exact job title>",
    "company": "<company name or 'Not specified'>",
    "location": "<city, country, or 'Remote' or 'Not specified'>",
    "work_mode": "<remote | hybrid | onsite | unknown>",
    "contract_type": "<CDI | CDD | freelance | internship | apprenticeship | temp | unknown>",
    "salary_range": "<exact salary with currency, or 'Not specified'>",
    "experience_required": "<e.g. '3-5 years' or 'Not specified'>",
    "posted_date": "<date or 'Unknown'>",
    "languages_required": ["language1"],
    "apply_url": "<direct application URL if found in job posting, else null>",
    "easy_apply": <true if job has LinkedIn Easy Apply or Indeed Apply button, else false>,
    "hiring_contact": "<name of recruiter/hiring manager if EXPLICITLY named in the posting (e.g. 'Marie Dupont' or 'John Smith - HR'). Do NOT guess. null if no name is mentioned.>"
  },
  "job_summary": "<2 sentences max>",
  "match_probability": <integer 0-100>,
  "match_reasoning": "<one sentence>",
  "seniority": {
    "candidate_level": "<intern|junior|mid|senior|lead|staff_principal|executive>",
    "job_level": "<intern|junior|mid|senior|lead|staff_principal|executive>",
    "alignment": "<right_level|stretch|reach|below_level|pivot>",
    "alignment_label": "<2-3 word summary, e.g. 'Right level' or 'Slight stretch'>",
    "alignment_reason": "<one sentence explaining the verdict>",
    "candidate_years": <number — total years of relevant experience>,
    "job_years_required": <number — years required by the role>
  },
  "red_flags": ["<posting red flag if any, max 3>"],
  "salary_assessment": {
    "specified": <true|false>,
    "assessment": "<below_market | market | above_market | unknown | not_specified>",
    "comment": "<brief>"
  },
  "salary_intelligence": {
    "currency": "<3-letter ISO: EUR, GBP, USD, CHF, CAD, etc. Match the posting's currency or local currency for the location.>",
    "scenario": "<'salary_mentioned' if posting includes a number/range, else 'salary_hidden'>",
    "posted_low": <number or null. The lower bound of salary in posting (annual, gross), or null if not specified>,
    "posted_high": <number or null. The upper bound of salary in posting, or null if not specified>,
    "estimated_market_low": <number. Your estimate of typical low end for this role in this location/seniority based on training data>,
    "estimated_market_high": <number. Your estimate of typical high end for this role in this location/seniority>,
    "target_low": <number. Realistic ask for someone with the candidate's profile — usually middle-to-upper of the range>,
    "target_high": <number. Stretch ask for the candidate IF they have strong leverage points (specific keywords, seniority match, etc.)>,
    "leverage_points": ["<specific reason 1 the candidate could push higher, e.g. 'Direct experience in fintech regulation'>", "<reason 2>", "<reason 3 max>"],
    "negotiation_strategy": "<2 sentences max. Tactical advice: when to mention numbers, what range to name first, how to anchor>",
    "confidence": "<'high' if very common role in major city, 'medium' if some assumptions made, 'low' if unusual role/location>"
  },
  "verdict": "<one sentence verdict, max 12 words>",
  "keyword_match": {
    "score": <0-100>,
    "found": ["max 10 keywords found verbatim in CV"],
    "missing_required": ["max 6 critical missing keywords"],
    "missing_nice": ["max 4 nice-to-have missing"]
  },
  "requirements_check": {
    "score": <0-100>,
    "met": ["max 5 requirements met"],
    "unmet": ["max 4 requirements not met"]
  },
  "format_warnings": ["<max 3, empty if clean>"],
  "critical_gaps": ["<max 3, empty if none>"],
  "quick_wins": [
    { "tip": "<action 1, max 12 words>", "example": "<copy-paste sentence with realistic details, max 25 words>" },
    { "tip": "<action 2, max 12 words>", "example": "<copy-paste sentence with realistic details, max 25 words>" },
    { "tip": "<action 3, max 12 words>", "example": "<copy-paste sentence with realistic details, max 25 words>" },
    { "tip": "<action 4, max 12 words>", "example": "<copy-paste sentence with realistic details, max 25 words>" }
  ],
  "overall_verdict": "<likely_filtered | borderline | likely_passed>",
  "overall_reason": "<one sentence>",
  "interview_prep": {
    "likely_questions": [
      "<5 specific interview questions tailored to THIS role + THIS candidate's CV gaps. Not generic ('Tell me about yourself'). Be specific — reference actual technologies, gaps, or experience from CV/job. E.g. 'How would you handle the React migration mentioned in the JD given your Vue background?'>"
    ],
    "your_edges": [
      "<3 things from candidate CV that EXCEED what the role requires. These are selling points to lean on in interview. Each: one concrete sentence quoting CV evidence.>"
    ],
    "weak_spots": [
      "<3 areas where candidate will be challenged in interview. Each item: one object {area: '<weak area>', prep_tip: '<concrete prep advice, 1 sentence>'}>"
    ],
    "salary_negotiation_hint": "<one sentence strategic advice based on salary range + candidate level. If salary not specified, advise asking range early.>",
    "show_prep": <boolean — true if display_score >= 50, else false>
  }
}

CRITICAL: Apply the rubric mechanically. Do not introduce subjective judgment. Same input = same output.

For interview_prep:
- likely_questions: think like a real hiring manager. Reference specific tech/gaps/CV items by name.
- your_edges: only include if genuinely above requirement. If candidate is junior for the role, this array can be smaller or focus on transferable strengths.
- weak_spots: be honest. Each weak spot must have a concrete prep_tip the candidate can act on.
- show_prep should be true if display_score >= 50 (worth interviewing for), else false.

For salary_intelligence:
- Estimate based on: job title, seniority level, location (city/country/region), required skills, contract type
- Use ROUND numbers (e.g., 60000, not 59783)
- All numbers in LOCAL ANNUAL GROSS currency (EUR for France/EU, GBP for UK, USD for US, CHF for Switzerland)
- target_low and target_high are a NEGOTIATION range:
  * If salary_mentioned: target = upper third of posted range; push = ~5-15% above posted high IF leverage points exist
  * If salary_hidden: target = realistic ask matching candidate profile; push = stretch with leverage
- leverage_points must be CONCRETE and tied to this CV + this job (not generic). Max 3 items. If fewer than 2 truthful items exist, return only the truthful ones.
- confidence: 'high' for common roles in major European cities, 'low' for unusual roles where market data is thin
- This is GUIDANCE not market data — numbers may be off by ±20%.`

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

async function requireAuthenticatedUser(req, supabase) {
  const token = getBearerToken(req)
  if (!token) {
    const error = new Error('Please sign in again before running an analysis.')
    error.statusCode = 401
    throw error
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) {
    const authError = new Error('Invalid or expired session. Please sign in again.')
    authError.statusCode = 401
    throw authError
  }

  return data.user
}

async function fetchJobText(url) {
  const isLinkedIn = url.includes('linkedin.')
  const isIndeed = url.includes('indeed.')
  const isGlassdoor = url.includes('glassdoor.')

  let res
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      redirect: 'follow'
    })
  } catch (fetchErr) {
    throw new Error('Could not reach this page. Please copy the job description text and paste it instead.')
  }

  if (!res.ok) {
    if (isLinkedIn) throw new Error('LinkedIn requires login to view this job. Please copy the job description text and paste it instead.')
    if (isIndeed) throw new Error('Indeed blocked this fetch. Please copy the job description text and paste it instead.')
    if (isGlassdoor) throw new Error('Glassdoor blocked this fetch. Please copy the job description text and paste it instead.')
    throw new Error('This page returned ' + res.status + '. Please copy the job description text and paste it instead.')
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
    throw new Error('Could not extract enough text from this page. Please copy the job description text and paste it instead.')
  }
  return text.slice(0, 6000)
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

// RATE LIMIT: max 15 analyses per user per hour, max 50 per day
// Whitelist of user IDs with elevated limits (admin / dev)
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

  const { count: hourCount } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  if (!isWhitelisted && (hourCount ?? 0) >= HOURLY_LIMIT) {
    return { allowed: false, reason: 'hourly', message: `Hourly limit reached (${HOURLY_LIMIT} analyses/hour). Please try again later.`, dayCount: 0, dayLimit }
  }

  const { count: dayCount } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneDayAgo)

  if ((dayCount ?? 0) >= dayLimit) {
    return { allowed: false, reason: 'daily', message: `Daily limit reached (${dayLimit} analyses/day). Please try again tomorrow.`, dayCount: dayCount ?? 0, dayLimit }
  }

  return { allowed: true, dayCount: dayCount ?? 0, dayLimit }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { jobUrl, jobText: providedJobText, cvBase64, cvMimeType, cvFileName } = req.body
    if ((!jobUrl && !providedJobText) || !cvBase64 || !cvMimeType) return res.status(400).json({ error: 'Missing required fields' })

    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return res.status(500).json({ error: 'Supabase server configuration is missing.' })

    const supabaseClient = createClient(url, key, { auth: { persistSession: false } })
    const authUser = await requireAuthenticatedUser(req, supabaseClient)
    const userId = authUser.id

    // SECURITY: rate limit check uses the authenticated user from the Supabase token.
    let rateLimitInfo = { dayCount: 0, dayLimit: DAILY_LIMIT }
    const rl = await checkRateLimit(supabaseClient, userId)
    rateLimitInfo = { dayCount: rl.dayCount, dayLimit: rl.dayLimit }
    if (!rl.allowed) {
      return res.status(429).json({ error: rl.message, rate_limited: true, reason: rl.reason })
    }

    const [jobText, cvText] = await Promise.all([
      providedJobText ? Promise.resolve(providedJobText.slice(0, 6000)) : fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract text from your CV. Make sure it is not a scanned image.' })
    }

    if (!jobText || jobText.trim().length < 100) {
      return res.status(400).json({ error: 'The job description is too short. Please paste at least 100 characters of the actual job posting (requirements, responsibilities, etc.).' })
    }

    // CACHE: same content = same result
    const cacheKey = hashContent(cvText.slice(0, 4000), jobText.slice(0, 4000))

    const { data: cached } = await supabaseClient
      .from('analyses')
      .select('result, created_at')
      .eq('user_id', userId)
      .eq('cache_key', cacheKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (cached?.result) {
      return res.status(200).json({ success: true, analysis: cached.result, cached: true })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB OFFER:\n${jobText.slice(0, 6000)}\n\n---\n\nCV:\n${cvText.slice(0, 6000)}` }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()

    let analysis
    try {
      analysis = JSON.parse(raw)
    } catch (parseErr) {
      console.error('JSON parse failed. Raw output (first 500):', raw.slice(0, 500))
      throw new Error('AI returned malformed JSON. This is usually transient — please try again.')
    }

    // Coerce scores defensively — AI might return string numbers or missing structure
    const safeScore = (val, fallback = 0) => {
      const n = typeof val === 'number' ? val : parseInt(val, 10)
      if (isNaN(n) || n < 0 || n > 100) return fallback
      return Math.round(n)
    }

    if (!analysis || typeof analysis !== 'object') {
      throw new Error('AI returned an unexpected response. Please try again.')
    }

    // Ensure structure exists with safe defaults rather than throwing
    analysis.keyword_match = analysis.keyword_match || { score: 0, found: [], missing: [] }
    analysis.requirements_check = analysis.requirements_check || { score: 0 }
    analysis.keyword_match.score = safeScore(analysis.keyword_match.score, 0)
    analysis.requirements_check.score = safeScore(analysis.requirements_check.score, 0)

    // Defensive defaults for salary_intelligence (older cached results may not have it)
    if (!analysis.salary_intelligence || typeof analysis.salary_intelligence !== 'object') {
      analysis.salary_intelligence = null
    } else {
      const si = analysis.salary_intelligence
      // Coerce numbers safely
      const safeNum = (v) => {
        const n = typeof v === 'number' ? v : parseFloat(v)
        return isNaN(n) || n <= 0 ? null : Math.round(n)
      }
      si.posted_low = safeNum(si.posted_low)
      si.posted_high = safeNum(si.posted_high)
      si.estimated_market_low = safeNum(si.estimated_market_low)
      si.estimated_market_high = safeNum(si.estimated_market_high)
      si.target_low = safeNum(si.target_low)
      si.target_high = safeNum(si.target_high)
      si.leverage_points = Array.isArray(si.leverage_points) ? si.leverage_points.slice(0, 3) : []
      si.currency = (typeof si.currency === 'string' && si.currency.length === 3) ? si.currency.toUpperCase() : 'EUR'
      si.confidence = ['high', 'medium', 'low'].includes(si.confidence) ? si.confidence : 'medium'
      si.scenario = ['salary_mentioned', 'salary_hidden'].includes(si.scenario) ? si.scenario : (si.posted_low ? 'salary_mentioned' : 'salary_hidden')
      // If we don't have at least target numbers, kill it — better to show nothing than garbage
      if (!si.target_low || !si.target_high) {
        analysis.salary_intelligence = null
      }
    }

    analysis.display_score = Math.round((analysis.keyword_match.score * 0.6) + (analysis.requirements_check.score * 0.4))
    analysis.job_url = jobUrl || null
    analysis.job_source = jobUrl ? 'url' : 'pasted'
    analysis.job_title = analysis.job_context?.title || null
    // CV text preview (first 800 chars) so user can verify what AI is reading
    analysis.cv_preview = cvText.trim().slice(0, 800).replace(/\s+/g, ' ').trim()
    analysis.cv_preview_truncated = cvText.trim().length > 800

    // Save with cache_key — upsert: if same cv+job already saved, update it
    let savedRow = null
    try {
      // First check if a row with this cache_key already exists for this user
      const { data: existing } = await supabaseClient
        .from('analyses')
        .select('id, application_status, status_updated_at')
        .eq('user_id', userId)
        .eq('cache_key', cacheKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Update existing row, preserve application_status
        const { data: updated } = await supabaseClient
          .from('analyses')
          .update({
            job_url: jobUrl || 'manual_paste',
            job_title: analysis.job_context?.title || null,
            score: analysis.display_score,
            result: analysis,
            cv_file_name: cvFileName || null
          })
          .eq('id', existing.id)
          .eq('user_id', userId)
          .select()
          .single()
        savedRow = updated
      } else {
        // Insert new row
        const { data: inserted } = await supabaseClient
          .from('analyses')
          .insert({
            user_id: userId,
            job_url: jobUrl || 'manual_paste',
            job_title: analysis.job_context?.title || null,
            score: analysis.display_score,
            result: analysis,
            cv_file_path: null,
            cv_file_name: cvFileName || null,
            cache_key: cacheKey
          })
          .select()
          .single()
        savedRow = inserted
      }
    } catch (e) { console.log('Save failed:', e.message) }

    return res.status(200).json({
      success: true,
      analysis,
      savedRow,
      rateLimit: rateLimitInfo
    })
  } catch (e) {
    console.error('Handler error:', e.message)
    return res.status(e.statusCode || 500).json({ error: e.message || 'Analysis failed' })
  }
}
