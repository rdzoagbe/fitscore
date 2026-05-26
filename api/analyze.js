import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import { enhanceAnalysisWithAts } from './ats-engine.js'

export const config = { maxDuration: 60 }

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const ANTHROPIC_TIMEOUT_MS = Number.parseInt(process.env.ANTHROPIC_TIMEOUT_MS || '30000', 10)
const JOB_TEXT_LIMIT = 4500
const CV_TEXT_LIMIT = 4500

const SYSTEM = `You are Joblytics ATS Intelligence Fast Mode.
Return ONLY valid JSON. No markdown. No commentary.
Analyze the candidate CV against the job offer and produce a practical jobseeker decision.
Be honest, specific, concise, and do not invent experience.
Scores must be integers from 0 to 100.
Return a JSON object using these keys when possible: job_context, job_summary, match_probability, match_reasoning, display_score, recruiter_shortlist, next_best_action, confidence, seniority, keyword_match, requirements_check, semantic_fit, seniority_fit, experience_depth, proof_gaps, hidden_expectations, red_flags, salary_assessment, salary_intelligence, verdict, overall_verdict, overall_reason, critical_gaps, format_warnings, quick_wins, rewrite_priorities, jobseeker_strategy, interview_prep.`

const WHITELIST = (process.env.RATE_LIMIT_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)
const HOURLY_LIMIT = 15
const DAILY_LIMIT = 50
const WHITELIST_DAILY = 500

function createAnalyzeTimer() {
  const startedAt = Date.now()
  let last = startedAt
  const steps = []
  return {
    mark(step, extra = {}) {
      const now = Date.now()
      const item = { step, stepMs: now - last, totalMs: now - startedAt, ...extra }
      last = now
      steps.push(item)
      console.log('[ANALYZE_TIMING]', JSON.stringify(item))
      return item
    },
    steps() { return steps }
  }
}

function htmlDecode(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

function cleanText(value = '', limit = 5500) {
  return htmlDecode(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limit)
}

function getRestrictedBoardName(url = '') {
  const lower = String(url).toLowerCase()
  if (lower.includes('linkedin.')) return 'LinkedIn'
  if (lower.includes('indeed.')) return 'Indeed'
  if (lower.includes('glassdoor.')) return 'Glassdoor'
  if (lower.includes('welcometothejungle.com')) return 'Welcome to the Jungle'
  if (lower.includes('builtin.com') || lower.includes('built-in.com')) return 'Built In'
  return null
}

function findJobPostingObject(input) {
  if (!input) return null
  if (Array.isArray(input)) {
    for (const item of input) {
      const found = findJobPostingObject(item)
      if (found) return found
    }
    return null
  }
  if (typeof input !== 'object') return null
  const type = input['@type']
  const typeText = Array.isArray(type) ? type.join(' ').toLowerCase() : String(type || '').toLowerCase()
  if (typeText.includes('jobposting')) return input
  if (input['@graph']) return findJobPostingObject(input['@graph'])
  for (const value of Object.values(input)) {
    const found = findJobPostingObject(value)
    if (found) return found
  }
  return null
}

function extractJsonLdJobText(html = '') {
  const scripts = [...String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim())
      const job = findJobPostingObject(parsed)
      if (!job) continue
      const location = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation
      const parts = [
        job.title,
        job.hiringOrganization?.name,
        location?.address?.addressLocality,
        location?.address?.addressCountry,
        job.employmentType,
        job.baseSalary?.value?.minValue && job.baseSalary?.value?.maxValue ? `${job.baseSalary.value.minValue} - ${job.baseSalary.value.maxValue}` : '',
        job.description,
        Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : job.responsibilities,
        Array.isArray(job.qualifications) ? job.qualifications.join('\n') : job.qualifications,
        Array.isArray(job.skills) ? job.skills.join('\n') : job.skills
      ]
      const text = cleanText(parts.filter(Boolean).join('\n\n'), JOB_TEXT_LIMIT)
      if (text.length >= 200) return text
    } catch {}
  }
  return ''
}

function extractMetaJobText(html = '') {
  const text = String(html || '')
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ]
  const parts = []
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) parts.push(match[1])
  }
  return cleanText(parts.join('\n\n'), 2500)
}

function extractBestJobTextFromHtml(html = '') {
  const jsonLd = extractJsonLdJobText(html)
  if (jsonLd.length >= 200) return jsonLd
  const meta = extractMetaJobText(html)
  if (meta.length >= 200) return meta
  return cleanText(html, JOB_TEXT_LIMIT)
}

async function fetchJobText(url) {
  const restrictedBoard = getRestrictedBoardName(url)
  let res
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
  const text = extractBestJobTextFromHtml(await res.text())
  if (text.length < 200) {
    const err = new Error(`${restrictedBoard || 'This job page'} did not expose enough readable job text. Please use Mode texte and paste the job description.`)
    err.statusCode = 400
    err.code = 'URL_TEXT_TOO_SHORT'
    throw err
  }
  return text.slice(0, JOB_TEXT_LIMIT)
}

async function extractCvText(base64Data, mimeType = '') {
  try {
    const buffer = Buffer.from(base64Data, 'base64')
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js')
      return (await pdfParse(buffer)).text
    }
    if (mimeType.includes('word') || mimeType.includes('officedocument')) {
      const mammoth = await import('mammoth')
      return (await mammoth.extractRawText({ buffer })).value
    }
  } catch (e) {
    const err = new Error(`Could not extract text from your CV: ${e.message}`)
    err.statusCode = 400
    err.code = 'CV_PARSE_FAILED'
    throw err
  }
  const err = new Error('Unsupported file type. Please upload a PDF or Word document.')
  err.statusCode = 400
  err.code = 'UNSUPPORTED_FILE_TYPE'
  throw err
}

function hashContent(...parts) {
  return crypto.createHash('sha256').update(parts.join('||')).digest('hex')
}

async function getSupabaseClient() {
  try {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return null
    return createClient(url, key, { auth: { persistSession: false } })
  } catch {
    return null
  }
}

async function checkRateLimit(supabase, userId) {
  if (!supabase || !userId) return { allowed: true, dayCount: 0, dayLimit: DAILY_LIMIT }
  try {
    const isWhitelisted = WHITELIST.includes(userId)
    const dayLimit = isWhitelisted ? WHITELIST_DAILY : DAILY_LIMIT
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: hourCount } = await supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', oneHourAgo)
    if (!isWhitelisted && (hourCount ?? 0) >= HOURLY_LIMIT) return { allowed: false, reason: 'hourly', message: `Hourly limit reached (${HOURLY_LIMIT} analyses/hour). Please try again later.`, dayCount: 0, dayLimit }
    const { count: dayCount } = await supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', oneDayAgo)
    if ((dayCount ?? 0) >= dayLimit) return { allowed: false, reason: 'daily', message: `Daily limit reached (${dayLimit} analyses/day). Please try again tomorrow.`, dayCount: dayCount ?? 0, dayLimit }
    return { allowed: true, dayCount: dayCount ?? 0, dayLimit }
  } catch (e) {
    console.log('Rate limit check skipped:', e.message)
    return { allowed: true, dayCount: 0, dayLimit: DAILY_LIMIT }
  }
}

function clampScore(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseInt(value, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function arr(value, limit = 10) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, limit) : []
}

function obj(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
}

function extractKeywords(text = '') {
  const stop = new Set(['avec', 'pour', 'dans', 'vous', 'nous', 'les', 'des', 'the', 'and', 'for', 'with', 'your', 'our', 'une', 'aux', 'sur', 'qui', 'que', 'are', 'this', 'that', 'from', 'experience', 'poste', 'mission', 'profil'])
  const words = cleanText(text, 6000).toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ0-9+#.-]{3,}/gi) || []
  const counts = new Map()
  for (const word of words) {
    const normalized = word.toLowerCase()
    if (stop.has(normalized) || normalized.length < 3) continue
    counts.set(normalized, (counts.get(normalized) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, 18)
}

function detectTitle(jobText = '') {
  const firstLines = cleanText(jobText, 700).split(/\n|\.|-/).map(s => s.trim()).filter(Boolean)
  return firstLines.find(line => line.length >= 4 && line.length <= 90) || 'Not specified'
}

function buildLocalAnalysis(jobText, cvText, jobUrl, reason = 'AI provider unavailable, local fallback used.') {
  const keywords = extractKeywords(jobText)
  const cvLower = cleanText(cvText, 8000).toLowerCase()
  const found = keywords.filter(k => cvLower.includes(k.toLowerCase())).slice(0, 10)
  const missing = keywords.filter(k => !cvLower.includes(k.toLowerCase())).slice(0, 8)
  const keywordScore = clampScore((found.length / Math.max(found.length + missing.length, 1)) * 100, 45)
  const depthBonus = cvText.length > 1500 ? 10 : 0
  const displayScore = clampScore(Math.round(keywordScore * 0.75 + 15 + depthBonus), 50)
  const shortlist = displayScore >= 75 ? 'strong_shortlist' : displayScore >= 52 ? 'possible_shortlist' : 'unlikely_shortlist'
  return {
    job_context: {
      title: detectTitle(jobText),
      company: 'Not specified',
      location: 'Not specified',
      work_mode: 'unknown',
      contract_type: 'unknown',
      salary_range: 'Not specified',
      experience_required: 'Not specified',
      languages_required: [],
      apply_url: null,
      easy_apply: false,
      hiring_contact: null
    },
    job_summary: 'Basic local analysis generated because the AI provider call did not complete. Review the detailed provider_error field in the API response.',
    match_probability: displayScore,
    match_reasoning: found.length ? `The CV matches several visible job keywords: ${found.slice(0, 5).join(', ')}.` : 'The CV has limited visible overlap with the extracted job description.',
    display_score: displayScore,
    recruiter_shortlist: {
      probability: displayScore,
      verdict: shortlist,
      reason: reason || 'Local fallback analysis used.',
      top_screening_factors: found.slice(0, 5),
      likely_recruiter_concerns: missing.slice(0, 5)
    },
    next_best_action: {
      action: displayScore >= 75 ? 'apply_now' : displayScore >= 52 ? 'improve_cv_first' : 'skip_or_low_priority',
      label: displayScore >= 75 ? 'Apply with targeted message' : 'Improve CV alignment first',
      reason: missing.length ? `Add clearer proof for: ${missing.slice(0, 4).join(', ')}.` : 'The extracted job keywords are mostly represented in the CV.',
      steps: ['Add missing must-have keywords naturally', 'Mirror the job title and responsibilities', 'Add measurable impact bullets']
    },
    confidence: { level: 'low', score: 45, reasons: [reason], job_text_quality: jobText.length > 1000 ? 'partial' : 'thin', cv_text_quality: cvText.length > 1000 ? 'partial' : 'thin' },
    seniority: { candidate_level: 'senior', job_level: 'senior', alignment: 'right_level', alignment_label: 'Needs AI confirmation', alignment_reason: 'Fallback mode cannot reliably infer seniority.', candidate_years: 0, job_years_required: 0 },
    keyword_match: { score: keywordScore, found, missing_required: missing, missing_nice: [], keyword_stuffing_risk: 'low' },
    requirements_check: { score: keywordScore, must_have: keywords.slice(0, 8), nice_to_have: [], met: found.slice(0, 6), unmet: missing.slice(0, 6) },
    semantic_fit: { score: displayScore, matched_responsibilities: found.slice(0, 6), weak_or_missing_responsibilities: missing.slice(0, 6), domain_fit: displayScore >= 65 ? 'moderate' : 'weak', domain_reason: 'Estimated from keyword overlap only.' },
    seniority_fit: { score: 60, risk: 'none' },
    experience_depth: { score: 55, hands_on: 'unclear', leadership: 'unclear', scale: 'unclear', metrics: 'unclear', ownership: 'unclear', proof_summary: 'Fallback mode cannot verify depth of experience.' },
    proof_gaps: missing.slice(0, 6),
    hidden_expectations: [],
    red_flags: reason ? [reason] : [],
    salary_assessment: { specified: false, assessment: 'unknown', comment: 'Salary not assessed in fallback mode.' },
    salary_intelligence: null,
    verdict: displayScore >= 75 ? 'Good apparent fit' : displayScore >= 52 ? 'Possible fit with edits' : 'Weak apparent fit',
    overall_verdict: displayScore >= 75 ? 'likely_passed' : displayScore >= 52 ? 'borderline' : 'likely_filtered',
    overall_reason: 'Generated by local fallback; run AI analysis once provider configuration is healthy.',
    critical_gaps: missing.slice(0, 4),
    format_warnings: [],
    quick_wins: ['Paste the full job description if URL extraction is weak', 'Use the same role terminology as the offer', 'Quantify leadership, scale, and outcomes'],
    rewrite_priorities: missing.slice(0, 6),
    jobseeker_strategy: { apply_message_angle: 'Position around the strongest matching responsibilities.', follow_up_timing: 'Follow up after 3-5 business days.', questions_to_ask_recruiter: [], skip_reason: null },
    interview_prep: { show_prep: true, likely_questions: [], your_edges: found.slice(0, 5), weak_spots: missing.slice(0, 5), salary_negotiation_hint: 'Confirm scope and package before giving a final number.' },
    job_url: jobUrl || null,
    job_source: jobUrl ? 'url' : 'pasted',
    cv_preview: cleanText(cvText, 800),
    cv_preview_truncated: cvText.trim().length > 800,
    analysis_version: 'ats-intelligence-v3-fallback',
    fallback_used: true
  }
}

function normalizeAnalysis(raw, jobUrl, cvText, jobText) {
  const fallback = buildLocalAnalysis(jobText, cvText, jobUrl, '')
  const analysis = { ...fallback, ...obj(raw, {}) }
  analysis.job_context = { ...fallback.job_context, ...obj(raw?.job_context, {}) }
  analysis.recruiter_shortlist = { ...fallback.recruiter_shortlist, ...obj(raw?.recruiter_shortlist, {}) }
  analysis.next_best_action = { ...fallback.next_best_action, ...obj(raw?.next_best_action, {}) }
  analysis.confidence = { ...fallback.confidence, ...obj(raw?.confidence, {}) }
  analysis.seniority = { ...fallback.seniority, ...obj(raw?.seniority, {}) }
  analysis.keyword_match = { ...fallback.keyword_match, ...obj(raw?.keyword_match, {}) }
  analysis.requirements_check = { ...fallback.requirements_check, ...obj(raw?.requirements_check, {}) }
  analysis.semantic_fit = { ...fallback.semantic_fit, ...obj(raw?.semantic_fit, {}) }
  analysis.seniority_fit = { ...fallback.seniority_fit, ...obj(raw?.seniority_fit, {}) }
  analysis.experience_depth = { ...fallback.experience_depth, ...obj(raw?.experience_depth, {}) }
  analysis.salary_assessment = { ...fallback.salary_assessment, ...obj(raw?.salary_assessment, {}) }
  analysis.jobseeker_strategy = { ...fallback.jobseeker_strategy, ...obj(raw?.jobseeker_strategy, {}) }
  analysis.interview_prep = { ...fallback.interview_prep, ...obj(raw?.interview_prep, {}) }

  analysis.display_score = clampScore(analysis.display_score, fallback.display_score)
  analysis.match_probability = clampScore(analysis.match_probability, analysis.display_score)
  analysis.keyword_match.score = clampScore(analysis.keyword_match.score, fallback.keyword_match.score)
  analysis.requirements_check.score = clampScore(analysis.requirements_check.score, fallback.requirements_check.score)
  analysis.semantic_fit.score = clampScore(analysis.semantic_fit.score, fallback.semantic_fit.score)
  analysis.seniority_fit.score = clampScore(analysis.seniority_fit.score, fallback.seniority_fit.score)
  analysis.experience_depth.score = clampScore(analysis.experience_depth.score, fallback.experience_depth.score)
  analysis.recruiter_shortlist.probability = clampScore(analysis.recruiter_shortlist.probability, analysis.match_probability)
  analysis.confidence.score = clampScore(analysis.confidence.score, 70)

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
  analysis.red_flags = arr(analysis.red_flags, 5)
  analysis.critical_gaps = arr(analysis.critical_gaps, 4)
  analysis.format_warnings = arr(analysis.format_warnings, 3)
  analysis.quick_wins = arr(analysis.quick_wins, 5)
  analysis.rewrite_priorities = arr(analysis.rewrite_priorities, 6)
  analysis.next_best_action.steps = arr(analysis.next_best_action.steps, 4)
  analysis.confidence.reasons = arr(analysis.confidence.reasons, 4)

  if (!['high', 'medium', 'low'].includes(analysis.confidence.level)) analysis.confidence.level = analysis.confidence.score >= 80 ? 'high' : analysis.confidence.score >= 55 ? 'medium' : 'low'
  if (!['strong_shortlist', 'possible_shortlist', 'unlikely_shortlist'].includes(analysis.recruiter_shortlist.verdict)) analysis.recruiter_shortlist.verdict = analysis.recruiter_shortlist.probability >= 75 ? 'strong_shortlist' : analysis.recruiter_shortlist.probability >= 50 ? 'possible_shortlist' : 'unlikely_shortlist'
  if (!['apply_now', 'improve_cv_first', 'prepare_interview', 'ask_recruiter_question', 'skip_or_low_priority'].includes(analysis.next_best_action.action)) analysis.next_best_action.action = analysis.display_score >= 78 ? 'apply_now' : analysis.display_score >= 55 ? 'improve_cv_first' : 'skip_or_low_priority'
  if (!['likely_filtered', 'borderline', 'likely_passed'].includes(analysis.overall_verdict)) analysis.overall_verdict = analysis.display_score >= 75 ? 'likely_passed' : analysis.display_score >= 50 ? 'borderline' : 'likely_filtered'

  analysis.job_url = jobUrl || null
  analysis.job_source = jobUrl ? 'url' : 'pasted'
  analysis.job_title = analysis.job_context?.title || null
  analysis.cv_preview = cleanText(cvText, 800)
  analysis.cv_preview_truncated = cvText.trim().length > 800
  analysis.analysis_version = 'ats-intelligence-v3'
  analysis.fallback_used = false
  return enhanceAnalysisWithAts(analysis, jobText, cvText)
}

function extractJsonObject(raw = '') {
  const text = String(raw || '').trim().replace(/```json|```/g, '').trim()
  try { return JSON.parse(text) } catch {}
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1))
  throw new Error('AI returned malformed JSON. Please retry the analysis.')
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.trim().length < 20) {
    const err = new Error('ANTHROPIC_API_KEY is missing or invalid in Vercel environment variables.')
    err.statusCode = 503
    err.code = 'ANTHROPIC_CONFIG_MISSING'
    throw err
  }
  return new Anthropic({ apiKey })
}

async function runClaudeAnalysis(jobText, cvText) {
  const client = getAnthropicClient()
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1200,
    temperature: 0,
    system: SYSTEM,
    messages: [{ role: 'user', content: `JOB OFFER:\n${jobText.slice(0, JOB_TEXT_LIMIT)}\n\n---\n\nCV:\n${cvText.slice(0, CV_TEXT_LIMIT)}` }]
  }, { timeout: Number.isFinite(ANTHROPIC_TIMEOUT_MS) ? ANTHROPIC_TIMEOUT_MS : 30000 })
  const raw = message.content.map(block => block.text || '').join('').trim()
  return extractJsonObject(raw)
}

function getHttpStatus(e) {
  const status = e?.statusCode || e?.status || e?.response?.status
  if (Number.isInteger(status) && status >= 400 && status < 600) return status
  return 500
}

function providerError(e) {
  const status = getHttpStatus(e)
  return {
    status,
    name: e?.name || 'Error',
    code: e?.code || e?.type || e?.error?.type || 'ANALYSIS_FAILED',
    message: e?.message || 'Analysis failed'
  }
}

function publicErrorMessage(e, status) {
  if (e?.code === 'ANTHROPIC_CONFIG_MISSING') return e.message
  if (status === 401) return 'Anthropic authentication failed. Check ANTHROPIC_API_KEY in Vercel environment variables.'
  if (status === 403) return 'Anthropic rejected the request. Check API key permissions and workspace access.'
  if (status === 400 && /model/i.test(e?.message || '')) return `Anthropic rejected the configured model (${DEFAULT_MODEL}). Check ANTHROPIC_MODEL in Vercel.`
  if (status === 429) return 'Anthropic rate limit or credit limit reached. Try again later or check billing/limits.'
  if (/timeout/i.test(e?.message || '') || e?.name === 'APIConnectionTimeoutError' || e?.code === 'ETIMEDOUT') return 'Analysis is taking too long. Please retry or paste shorter job/CV text.'
  return e?.message || 'Analysis failed'
}

async function readCachedAnalysis(supabase, userId, cacheKey) {
  if (!supabase || !userId || !cacheKey) return null
  try {
    const { data } = await supabase.from('analyses').select('result, created_at').eq('user_id', userId).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    return data?.result || null
  } catch (e) {
    console.log('Cache read skipped:', e.message)
    return null
  }
}

async function saveAnalysis(supabase, userId, cacheKey, analysis, jobUrl, cvFileName) {
  if (!supabase || !userId || !cacheKey || !analysis) return null
  try {
    const payload = { user_id: userId, job_url: jobUrl || 'manual_paste', job_title: analysis.job_context?.title || null, score: analysis.display_score, result: analysis, cv_file_path: null, cv_file_name: cvFileName || null, cache_key: cacheKey }
    const { data: existing } = await supabase.from('analyses').select('id').eq('user_id', userId).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existing?.id) {
      const { data } = await supabase.from('analyses').update(payload).eq('id', existing.id).select().single()
      return data || null
    }
    const { data } = await supabase.from('analyses').insert(payload).select().single()
    return data || null
  } catch (e) {
    console.log('Save failed:', e.message)
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const timer = createAnalyzeTimer()

  try {
    timer.mark('start')
    const { jobUrl, jobText: providedJobText, cvBase64, cvMimeType, userId, cvFileName, debug = false, skipAi = false } = req.body || {}
    if ((!jobUrl && !providedJobText) || !cvBase64 || !cvMimeType) return res.status(400).json({ success: false, error: 'Missing required fields', code: 'MISSING_REQUIRED_FIELDS' })

    const supabase = await getSupabaseClient()
    const rateLimit = await checkRateLimit(supabase, userId)
    if (!rateLimit.allowed) return res.status(429).json({ success: false, error: rateLimit.message, rate_limited: true, reason: rateLimit.reason })

    timer.mark('before_extract')
    const [jobText, cvText] = await Promise.all([
      providedJobText ? Promise.resolve(cleanText(providedJobText, JOB_TEXT_LIMIT)) : fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])
    timer.mark('after_extract', { jobChars: jobText?.length || 0, cvChars: cvText?.length || 0, mode: providedJobText ? 'paste' : 'url' })

    if (!cvText || cvText.trim().length < 50) return res.status(400).json({ success: false, error: 'Could not extract enough text from your CV. Make sure it is not a scanned image.', code: 'CV_TEXT_TOO_SHORT', debug: timer.steps() })
    if (!jobText || jobText.trim().length < 100) return res.status(400).json({ success: false, error: 'The job description is too short. Please paste at least 100 characters of the actual job posting.', code: 'JOB_TEXT_TOO_SHORT', debug: timer.steps() })

    const cacheKey = hashContent('ats-v4', cvText.slice(0, CV_TEXT_LIMIT), jobText.slice(0, JOB_TEXT_LIMIT))
    const cached = await readCachedAnalysis(supabase, userId, cacheKey)
    if (cached) {
      timer.mark('cache_hit')
      return res.status(200).json({ success: true, analysis: cached, cached: true, rateLimit, debug: debug ? timer.steps() : undefined })
    }

    let analysis
    let aiProviderError = null

    if (skipAi) {
      analysis = enhanceAnalysisWithAts(buildLocalAnalysis(jobText, cvText, jobUrl, 'AI skipped by request.'), jobText, cvText)
    } else {
      try {
        timer.mark('before_claude', { model: DEFAULT_MODEL, timeoutMs: ANTHROPIC_TIMEOUT_MS })
        const aiResult = await runClaudeAnalysis(jobText, cvText)
        timer.mark('after_claude')
        analysis = normalizeAnalysis(aiResult, jobUrl, cvText, jobText)
      } catch (e) {
        aiProviderError = providerError(e)
        console.error('Claude analysis failed:', JSON.stringify(aiProviderError))
        analysis = enhanceAnalysisWithAts(buildLocalAnalysis(jobText, cvText, jobUrl, publicErrorMessage(e, aiProviderError.status)), jobText, cvText)
        analysis.provider_error = aiProviderError
      }
    }

    const savedRow = await saveAnalysis(supabase, userId, cacheKey, analysis, jobUrl, cvFileName)
    timer.mark('success', { fallback: !!aiProviderError || !!skipAi, version: analysis.analysis_version })
    return res.status(200).json({ success: true, analysis, savedRow, fallback: !!aiProviderError || !!skipAi, providerError: debug ? aiProviderError : undefined, rateLimit, debug: debug ? timer.steps() : undefined })
  } catch (e) {
    const statusCode = getHttpStatus(e)
    const error = publicErrorMessage(e, statusCode)
    const details = providerError(e)
    console.error('Handler error:', JSON.stringify(details))
    return res.status(statusCode).json({ success: false, error, code: details.code, details, debug: timer.steps() })
  }
}
