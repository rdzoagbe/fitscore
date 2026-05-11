import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import crypto from 'crypto'
import { aiErrorPayload, buildFallbackAnalysis, extractJsonFromAiText, runWithAiRetry } from '../server/_aiReliability.js'
import { getUsageGate, recordUsageEvent, USAGE_ACTIONS } from '../server/_usageEvents.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ANALYZE_MODELS = (process.env.ANTHROPIC_ANALYZE_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514,claude-3-5-sonnet-20241022,claude-3-5-haiku-20241022')
  .split(',')
  .map(model => model.trim())
  .filter(Boolean)

const SYSTEM = `You are Joblytics, an ATS specialist, recruiter, and career coach.
Return ONLY valid JSON. No markdown. No preamble.

Score mechanically:
- keyword_match.score: percentage of important job keywords found verbatim or very close in the CV.
- requirements_check.score: average of hard requirements met, partially met, or missing.
- display_score is calculated by the server, so do not calculate it.
- overall_verdict: likely_passed when keyword and requirements scores are both >= 70 with no major critical gap; borderline when both >= 50; otherwise likely_filtered.

Return this exact JSON shape:
{
  "job_context": { "title": "string", "company": "string or Not specified", "location": "string or Not specified", "work_mode": "remote|hybrid|onsite|unknown", "contract_type": "CDI|CDD|freelance|internship|apprenticeship|temp|unknown", "salary_range": "string or Not specified", "experience_required": "string or Not specified", "posted_date": "string or Unknown", "languages_required": ["string"], "apply_url": null, "easy_apply": false, "hiring_contact": null },
  "job_summary": "2 sentences max",
  "match_probability": 0,
  "match_reasoning": "one sentence",
  "seniority": { "candidate_level": "intern|junior|mid|senior|lead|staff_principal|executive", "job_level": "intern|junior|mid|senior|lead|staff_principal|executive", "alignment": "right_level|stretch|reach|below_level|pivot", "alignment_label": "short label", "alignment_reason": "one sentence", "candidate_years": 0, "job_years_required": 0 },
  "red_flags": [],
  "salary_assessment": { "specified": false, "assessment": "below_market|market|above_market|unknown|not_specified", "comment": "brief" },
  "salary_intelligence": { "currency": "EUR", "scenario": "salary_mentioned|salary_hidden", "posted_low": null, "posted_high": null, "estimated_market_low": 0, "estimated_market_high": 0, "target_low": 0, "target_high": 0, "leverage_points": [], "negotiation_strategy": "2 sentences max", "confidence": "high|medium|low" },
  "verdict": "max 12 words",
  "keyword_match": { "score": 0, "found": [], "missing_required": [], "missing_nice": [] },
  "requirements_check": { "score": 0, "met": [], "unmet": [] },
  "format_warnings": [],
  "critical_gaps": [],
  "quick_wins": [{ "tip": "short action", "example": "copy-paste CV sentence" }],
  "overall_verdict": "likely_filtered|borderline|likely_passed",
  "overall_reason": "one sentence",
  "interview_prep": { "likely_questions": [], "your_edges": [], "weak_spots": [], "salary_negotiation_hint": "one sentence", "show_prep": true }
}`

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
  const lowerUrl = String(url || '').toLowerCase()
  const isLinkedIn = lowerUrl.includes('linkedin.')
  const isIndeed = lowerUrl.includes('indeed.')
  const isGlassdoor = lowerUrl.includes('glassdoor.')
  let res
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    })
  } catch {
    throw new Error('Could not reach this page. Please copy the job description text and paste it instead.')
  }
  if (!res.ok) {
    if (isLinkedIn) throw new Error('LinkedIn requires login to view this job. Please copy the job description text and paste it instead.')
    if (isIndeed) throw new Error('Indeed blocked this fetch. Please copy the job description text and paste it instead.')
    if (isGlassdoor) throw new Error('Glassdoor blocked this fetch. Please copy the job description text and paste it instead.')
    throw new Error('This page returned ' + res.status + '. Please copy the job description text and paste it instead.')
  }
  const html = await res.text()
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<noscript[\s\S]*?<\/noscript>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s{2,}/g, ' ').trim()
  if (text.length < 200) throw new Error('Could not extract enough text from this page. Please copy the job description text and paste it instead.')
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

function normalizeArray(value, max = 10) {
  if (!Array.isArray(value)) return []
  return value.filter(v => v !== null && v !== undefined).slice(0, max)
}

function safeScore(val, fallback = 0) {
  const n = typeof val === 'number' ? val : parseInt(val, 10)
  if (Number.isNaN(n) || n < 0 || n > 100) return fallback
  return Math.round(n)
}

function normalizeAnalysis(analysis, jobUrl, cvText) {
  if (!analysis || typeof analysis !== 'object') throw new Error('AI returned an unexpected response. Please try again.')
  analysis.job_context = analysis.job_context || {}
  analysis.job_context.title = analysis.job_context.title || 'Not specified'
  analysis.job_context.company = analysis.job_context.company || 'Not specified'
  analysis.job_context.location = analysis.job_context.location || 'Not specified'
  analysis.keyword_match = analysis.keyword_match || {}
  analysis.keyword_match.score = safeScore(analysis.keyword_match.score, 0)
  analysis.keyword_match.found = normalizeArray(analysis.keyword_match.found, 10)
  analysis.keyword_match.missing_required = normalizeArray(analysis.keyword_match.missing_required || analysis.keyword_match.missing, 6)
  analysis.keyword_match.missing_nice = normalizeArray(analysis.keyword_match.missing_nice, 4)
  analysis.requirements_check = analysis.requirements_check || {}
  analysis.requirements_check.score = safeScore(analysis.requirements_check.score, 0)
  analysis.requirements_check.met = normalizeArray(analysis.requirements_check.met, 5)
  analysis.requirements_check.unmet = normalizeArray(analysis.requirements_check.unmet, 4)
  analysis.format_warnings = normalizeArray(analysis.format_warnings, 3)
  analysis.critical_gaps = normalizeArray(analysis.critical_gaps, 3)
  analysis.quick_wins = normalizeArray(analysis.quick_wins, 4)
  analysis.red_flags = normalizeArray(analysis.red_flags, 3)
  analysis.seniority = analysis.seniority || { candidate_level: 'mid', job_level: 'mid', alignment: 'right_level', alignment_label: 'Right level', alignment_reason: 'The role appears broadly aligned.', candidate_years: 0, job_years_required: 0 }
  analysis.salary_assessment = analysis.salary_assessment || { specified: false, assessment: 'unknown', comment: 'Salary information was not clear in the posting.' }
  analysis.salary_intelligence = null
  analysis.interview_prep = analysis.interview_prep || {}
  analysis.interview_prep.likely_questions = normalizeArray(analysis.interview_prep.likely_questions, 5)
  analysis.interview_prep.your_edges = normalizeArray(analysis.interview_prep.your_edges, 3)
  analysis.interview_prep.weak_spots = normalizeArray(analysis.interview_prep.weak_spots, 3)
  analysis.interview_prep.show_prep = analysis.interview_prep.show_prep !== false
  analysis.display_score = Math.round((analysis.keyword_match.score * 0.6) + (analysis.requirements_check.score * 0.4))
  analysis.match_probability = safeScore(analysis.match_probability, analysis.display_score)
  analysis.overall_verdict = ['likely_filtered', 'borderline', 'likely_passed'].includes(analysis.overall_verdict) ? analysis.overall_verdict : (analysis.display_score >= 70 ? 'likely_passed' : analysis.display_score >= 50 ? 'borderline' : 'likely_filtered')
  analysis.verdict = analysis.verdict || (analysis.overall_verdict === 'likely_passed' ? 'Strong match' : analysis.overall_verdict === 'borderline' ? 'Possible match' : 'Weak match')
  analysis.overall_reason = analysis.overall_reason || analysis.match_reasoning || 'Score is based on keyword and requirement alignment.'
  analysis.match_reasoning = analysis.match_reasoning || analysis.overall_reason
  analysis.job_summary = analysis.job_summary || 'Job summary unavailable.'
  analysis.job_url = jobUrl || null
  analysis.job_source = jobUrl ? 'url' : 'pasted'
  analysis.job_title = analysis.job_context?.title || null
  analysis.cv_preview = cvText.trim().slice(0, 800).replace(/\s+/g, ' ').trim()
  analysis.cv_preview_truncated = cvText.trim().length > 800
  return analysis
}

async function callAnthropicWithFallback({ system, jobText, cvText }) {
  let lastError = null
  for (const model of ANALYZE_MODELS) {
    try {
      return await runWithAiRetry(() => client.messages.create({
        model,
        max_tokens: 2200,
        temperature: 0,
        system,
        messages: [{ role: 'user', content: `JOB OFFER:\n${jobText.slice(0, 5200)}\n\n---\n\nCV:\n${cvText.slice(0, 5200)}` }]
      }), { attempts: 2, baseDelayMs: 700 })
    } catch (error) {
      lastError = error
      if (![400, 404].includes(error?.status)) throw error
    }
  }
  const error = new Error(lastError?.error?.message || lastError?.message || 'AI provider rejected the analysis request.')
  error.statusCode = lastError?.status || 502
  error.status = lastError?.status || 502
  throw error
}

async function saveAnalysis(supabaseClient, authUser, { cacheKey, jobUrl, analysis, cvFileName }) {
  try {
    const { data: existing } = await supabaseClient.from('analyses').select('id').eq('user_id', authUser.id).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const payload = { job_url: jobUrl || 'manual_paste', job_title: analysis.job_context?.title || null, score: analysis.display_score, result: analysis, cv_file_name: cvFileName || null }
    if (existing) {
      const { data, error } = await supabaseClient.from('analyses').update(payload).eq('id', existing.id).eq('user_id', authUser.id).select().single()
      if (error) throw error
      return data
    }
    const { data, error } = await supabaseClient.from('analyses').insert({ user_id: authUser.id, ...payload, cv_file_path: null, cache_key: cacheKey }).select().single()
    if (error) throw error
    return data
  } catch (e) {
    console.log('Save failed:', e.message)
    return null
  }
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
    const usageGate = await getUsageGate(supabaseClient, authUser, USAGE_ACTIONS.ANALYSIS)
    const rateLimitInfo = { planId: usageGate.plan.id, planLabel: usageGate.plan.label, analysisUsed: usageGate.used, analysisLimit: usageGate.limit, analysisRemaining: usageGate.limit >= 9999 ? Infinity : Math.max(0, usageGate.limit - usageGate.used), sources: usageGate.sources }
    if (!usageGate.allowed) return res.status(429).json({ ...usageGate.payload, rateLimit: rateLimitInfo })
    const [jobText, cvText] = await Promise.all([providedJobText ? Promise.resolve(providedJobText.slice(0, 6000)) : fetchJobText(jobUrl), extractCvText(cvBase64, cvMimeType)])
    if (!cvText || cvText.trim().length < 50) return res.status(400).json({ error: 'Could not extract text from your CV. Make sure it is not a scanned image.' })
    if (!jobText || jobText.trim().length < 100) return res.status(400).json({ error: 'The job description is too short. Please paste at least 100 characters of the actual job posting.' })
    const cacheKey = hashContent(cvText.slice(0, 4000), jobText.slice(0, 4000))
    const { data: cached } = await supabaseClient.from('analyses').select('result, created_at').eq('user_id', authUser.id).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (cached?.result) return res.status(200).json({ success: true, analysis: cached.result, cached: true, rateLimit: rateLimitInfo })
    let analysis
    let fallbackUsed = false
    try {
      const message = await callAnthropicWithFallback({ system: SYSTEM, jobText, cvText })
      const raw = message.content.map(b => b.text || '').join('').trim()
      analysis = normalizeAnalysis(extractJsonFromAiText(raw), jobUrl, cvText)
    } catch (e) {
      const payload = aiErrorPayload(e, 'analysis')
      if (payload.code === 'ai_input_too_long' || payload.code === 'ai_provider_error') {
        analysis = normalizeAnalysis(buildFallbackAnalysis({ jobText, cvText, jobUrl }), jobUrl, cvText)
        fallbackUsed = true
      } else return res.status(payload.statusCode || 503).json(payload)
    }
    const savedRow = await saveAnalysis(supabaseClient, authUser, { cacheKey, jobUrl, analysis, cvFileName })
    if (savedRow) await recordUsageEvent(supabaseClient, authUser, USAGE_ACTIONS.ANALYSIS, { source: providedJobText ? 'paste' : 'url', cached: false, fallback: fallbackUsed, analysis_id: savedRow.id })
    const nextRateLimitInfo = { ...rateLimitInfo, analysisUsed: usageGate.used + (savedRow ? 1 : 0), analysisRemaining: usageGate.limit >= 9999 ? Infinity : Math.max(0, usageGate.limit - usageGate.used - (savedRow ? 1 : 0)) }
    return res.status(200).json({ success: true, analysis, savedRow, rateLimit: nextRateLimitInfo, fallback: fallbackUsed })
  } catch (e) {
    console.error('Handler error:', { message: e.message, statusCode: e.statusCode, status: e.status, type: e?.error?.type, apiMessage: e?.error?.message })
    return res.status(e.statusCode || 500).json({ error: e.message || 'Analysis failed' })
  }
}
