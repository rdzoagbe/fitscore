import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import { applyDeterministicAts, validateJobTextQuality } from './ats-deterministic.js'

export const config = { maxDuration: 60 }

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const JOB_TEXT_LIMIT = 6000
const CV_TEXT_LIMIT = 6000
const CACHE_VERSION = 'ats-v12-sonnet'

const SYSTEM = `You are Joblytics-AI, a strict ATS analyst and career coach.
Return ONLY valid JSON. No markdown.
Do not invent experience. Do not assume a candidate has a tool unless it appears in the CV or is a strict industry synonym.
The final score will be calculated by the server. Your job is to extract context, explain gaps, and give useful coaching.

Return this JSON shape:
{
  "job_context": { "title": "string", "company": "string", "location": "string", "work_mode": "remote|hybrid|onsite|unknown", "contract_type": "string", "salary_range": "string", "experience_required": "string", "languages_required": [], "apply_url": null, "easy_apply": false, "hiring_contact": null, "hiring_contact_linkedin": null },
  "job_sections": { "about_company": null, "about_role": null, "key_responsibilities": [], "key_requirements": [], "benefits": null },
  "job_summary": "string",
  "match_reasoning": "string",
  "recruiter_shortlist": { "probability": 0, "verdict": "strong_shortlist|possible_shortlist|unlikely_shortlist", "reason": "string", "top_screening_factors": [], "likely_recruiter_concerns": [] },
  "next_best_action": { "action": "apply_now|improve_cv_first|prepare_interview|ask_recruiter_question|skip_or_low_priority", "label": "string", "reason": "string", "steps": [] },
  "confidence": { "level": "high|medium|low", "score": 0, "reasons": [], "job_text_quality": "strong|partial|thin", "cv_text_quality": "strong|partial|thin" },
  "semantic_fit": { "score": 0, "matched_responsibilities": [], "weak_or_missing_responsibilities": [], "domain_fit": "strong|moderate|weak", "domain_reason": "string" },
  "experience_depth": { "score": 0, "hands_on": "visible|weak_or_missing|unclear", "leadership": "visible|weak_or_missing|unclear", "scale": "visible|weak_or_missing|unclear", "metrics": "visible|weak_or_missing|unclear", "ownership": "visible|weak_or_missing|unclear", "proof_summary": "string" },
  "proof_gaps": [],
  "hidden_expectations": [],
  "red_flags": [],
  "salary_assessment": { "specified": false, "assessment": "unknown", "comment": "string" },
  "salary_intelligence": null,
  "verdict": "string",
  "overall_reason": "string",
  "format_warnings": [],
  "quick_wins": [],
  "jobseeker_strategy": { "apply_message_angle": "string", "follow_up_timing": "string", "questions_to_ask_recruiter": [], "skip_reason": null },
  "interview_prep": { "show_prep": true, "likely_questions": [], "your_edges": [], "weak_spots": [], "salary_negotiation_hint": "string" }
}`

function htmlDecode(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function cleanText(value = '', limit = 6000) {
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
    .trim()
    .slice(0, limit)
}

function hashContent(...parts) {
  return crypto.createHash('sha256').update(parts.join('||')).digest('hex')
}

function normalizeUrlForCache(url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    ;['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','referer','source','trk'].forEach(p => u.searchParams.delete(p))
    const path = u.pathname.replace(/\/+$/, '') || '/'
    return `${u.hostname}${path}${u.search}`
  } catch {
    return String(url || '').toLowerCase().trim()
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  return typeof header === 'string' ? (header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null) : null
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function getUserFromToken(req) {
  const token = getBearerToken(req)
  if (!token) return null
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await sb.auth.getUser(token)
    return error ? null : data?.user || null
  } catch {
    return null
  }
}

async function readCachedAnalysis(supabase, userId, cacheKey) {
  if (!supabase || !userId || !cacheKey) return null
  try {
    const { data } = await supabase.from('analyses').select('result').eq('user_id', userId).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    return data?.result || null
  } catch {
    return null
  }
}

async function saveAnalysis(supabase, userId, cacheKey, analysis, jobUrl, cvFileName) {
  if (!supabase || !userId || !cacheKey || !analysis) return null
  const payload = { user_id: userId, job_url: jobUrl || 'manual_paste', job_title: analysis.job_context?.title || null, score: analysis.display_score, result: analysis, cv_file_path: null, cv_file_name: cvFileName || null, cache_key: cacheKey }
  try {
    const { data: existing } = await supabase.from('analyses').select('id').eq('user_id', userId).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existing?.id) {
      const { data } = await supabase.from('analyses').update(payload).eq('id', existing.id).select().single()
      return data || null
    }
    const { data } = await supabase.from('analyses').insert(payload).select().single()
    return data || null
  } catch (error) {
    console.log('[ANALYZE_ACCURATE] save skipped:', error?.message || error)
    return null
  }
}

function extractJsonObject(raw = '') {
  const text = String(raw || '').trim().replace(/```json|```/g, '').trim()
  try { return JSON.parse(text) } catch {}
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1))
  throw new Error('AI returned malformed JSON.')
}

function getJinaApiKey() {
  return process.env.JINA_API_KEY || process.env.JINA_AI_API_KEY || process.env.JINAAI_API_KEY || ''
}

function normalizeJinaContent(raw = '') {
  const markerIdx = raw.indexOf('Markdown Content:')
  const content = markerIdx >= 0 ? raw.slice(markerIdx + 'Markdown Content:'.length).trim() : raw.trim()
  return cleanText(content, JOB_TEXT_LIMIT)
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function buildJinaTargets(url) {
  const clean = String(url || '').trim()
  const withoutScheme = clean.replace(/^https?:\/\//i, '')
  return [...new Set([
    `https://r.jina.ai/${clean}`,
    `https://r.jina.ai/http://${withoutScheme}`,
    `https://r.jina.ai/http://https://${withoutScheme}`
  ])]
}

async function fetchViaJina(url) {
  const jinaApiKey = getJinaApiKey()
  const headers = {
    Accept: 'text/plain,text/markdown,*/*',
    'X-Return-Format': 'markdown',
    'X-With-Generated-Alt': 'true'
  }
  if (jinaApiKey) headers.Authorization = `Bearer ${jinaApiKey}`

  const attempts = []
  for (const target of buildJinaTargets(url)) {
    try {
      const res = await fetchWithTimeout(target, { headers, redirect: 'follow' }, 24000)
      if (!res.ok) {
        attempts.push({ target, status: res.status })
        continue
      }
      const raw = await res.text()
      const text = normalizeJinaContent(raw)
      if (text.length >= 150) return { text, provider: jinaApiKey ? 'jina-authenticated' : 'jina-public', jinaTarget: target }
      attempts.push({ target, status: res.status, reason: 'TEXT_TOO_SHORT', length: text.length })
    } catch (error) {
      attempts.push({ target, code: error?.code || 'JINA_TARGET_FAILED', message: error?.message || 'Jina target failed' })
    }
  }

  const err = new Error('Jina extraction failed for all target formats.')
  err.code = 'JINA_FETCH_FAILED'
  err.attempts = attempts
  throw err
}

async function fetchDirectHtml(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
  }
  const res = await fetchWithTimeout(url, { headers, redirect: 'follow' }, 9000)
  if (!res.ok) {
    const err = new Error(`Direct extraction failed with HTTP ${res.status}`)
    err.code = 'DIRECT_FETCH_FAILED'
    throw err
  }
  const html = await res.text()
  const text = cleanText(html, JOB_TEXT_LIMIT)
  if (text.length < 150) {
    const err = new Error('Direct extraction returned too little readable content.')
    err.code = 'DIRECT_TEXT_TOO_SHORT'
    throw err
  }
  return { text, provider: 'direct-html' }
}

async function fetchJobText(url) {
  const attempts = []

  try {
    return await fetchViaJina(url)
  } catch (error) {
    attempts.push({ provider: 'jina', code: error?.code || 'JINA_FAILED', message: error?.message || 'Jina extraction failed', attempts: error?.attempts })
  }

  try {
    return await fetchDirectHtml(url)
  } catch (error) {
    attempts.push({ provider: 'direct-html', code: error?.code || 'DIRECT_FAILED', message: error?.message || 'Direct extraction failed' })
  }

  const err = new Error('This job page could not be reliably extracted. Paste the job description directly for accurate scoring.')
  err.statusCode = 400
  err.code = 'URL_FETCH_FAILED'
  err.extractionAttempts = attempts
  throw err
}

async function extractCvText(base64Data, mimeType = '') {
  const buffer = Buffer.from(base64Data, 'base64')
  if (mimeType.includes('pdf')) {
    try {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js')
      const text = (await pdfParse(buffer)).text || ''
      if (text.trim().length >= 50) return text
    } catch {}
    const err = new Error('Could not extract enough text from your PDF CV. If it is scanned, upload a text-based PDF or Word file.')
    err.statusCode = 400
    err.code = 'CV_PARSE_FAILED'
    throw err
  }
  if (mimeType.includes('word') || mimeType.includes('officedocument')) {
    const mammoth = await import('mammoth')
    return (await mammoth.extractRawText({ buffer })).value || ''
  }
  const err = new Error('Unsupported file type. Please upload a PDF or Word document.')
  err.statusCode = 400
  err.code = 'UNSUPPORTED_FILE_TYPE'
  throw err
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.trim().length < 20) return null
  return new Anthropic({ apiKey: apiKey.trim() })
}

async function runClaudeAnalysis(jobText, cvText) {
  const client = getAnthropicClient()
  if (!client) return {}
  const userContent = `[JOB DESCRIPTION]\n${jobText.slice(0, JOB_TEXT_LIMIT)}\n\n[CANDIDATE RESUME]\n${cvText.slice(0, CV_TEXT_LIMIT)}`

  // The AI explanation is the difference between a real analysis and a bare
  // keyword estimate, so make it resilient: retry transient failures and one
  // malformed-JSON response before giving up to the deterministic fallback.
  let lastError = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await client.messages.create(
        {
          model: DEFAULT_MODEL,
          max_tokens: 2200,
          temperature: 0,
          system: SYSTEM,
          messages: [{ role: 'user', content: userContent }]
        },
        { timeout: 45000, maxRetries: 0 }
      )
      const raw = (message.content || []).map(block => block.text || '').join('').trim()
      return extractJsonObject(raw)
    } catch (error) {
      lastError = error
      const status = error?.status || error?.statusCode
      const retryable = !status || status === 408 || status === 429 || status >= 500 || error?.name === 'APIConnectionError' || /malformed json/i.test(error?.message || '')
      if (!retryable || attempt === 2) break
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)))
    }
  }
  throw lastError || new Error('AI explanation failed')
}

function fallbackAnalysis(jobText, cvText, jobUrl, reason) {
  return {
    job_context: { title: 'Not specified', company: 'Not specified', location: 'Not specified', work_mode: 'unknown', contract_type: 'unknown', salary_range: 'Not specified', experience_required: 'Not specified', languages_required: [], apply_url: null, easy_apply: false, hiring_contact: null, hiring_contact_linkedin: null },
    job_summary: 'Analysis generated with deterministic ATS scoring. AI explanation was unavailable or skipped.',
    match_reasoning: reason || 'Deterministic scoring applied.',
    recruiter_shortlist: { probability: 0, verdict: 'possible_shortlist', reason: reason || 'Deterministic ATS scoring used.', top_screening_factors: [], likely_recruiter_concerns: [] },
    next_best_action: { action: 'improve_cv_first', label: 'Improve CV alignment', reason: 'Review missing required keywords and evidence.', steps: ['Add truthful missing keywords', 'Add measurable impact', 'Mirror the job wording'] },
    confidence: { level: 'low', score: 45, reasons: [reason || 'Keyword-only estimate — the AI review did not run.'], job_text_quality: jobText.length > 1800 ? 'strong' : 'partial', cv_text_quality: cvText.length > 1200 ? 'strong' : 'partial' },
    semantic_fit: { score: 0, matched_responsibilities: [], weak_or_missing_responsibilities: [], domain_fit: 'moderate', domain_reason: 'Estimated from ATS overlap.' },
    experience_depth: { score: 0, hands_on: 'unclear', leadership: 'unclear', scale: 'unclear', metrics: 'unclear', ownership: 'unclear', proof_summary: 'Review CV evidence against the job requirements.' },
    proof_gaps: [], hidden_expectations: [], red_flags: [], salary_assessment: { specified: false, assessment: 'unknown', comment: 'Salary not assessed.' }, salary_intelligence: null,
    verdict: 'ATS score calculated', overall_reason: 'Final score was calculated by the deterministic ATS engine.', format_warnings: [], quick_wins: [], jobseeker_strategy: { apply_message_angle: 'Lead with the strongest matching requirements.', follow_up_timing: 'Follow up after 3-5 business days.', questions_to_ask_recruiter: [], skip_reason: null }, interview_prep: { show_prep: true, likely_questions: [], your_edges: [], weak_spots: [], salary_negotiation_hint: 'Ask for the range early if not listed.' }, job_url: jobUrl || null, job_source: jobUrl ? 'url' : 'pasted'
  }
}

function publicError(error) {
  return error?.message || 'Analysis failed.'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const authUser = await getUserFromToken(req)
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentication required. Please sign in and try again.', code: 'UNAUTHORIZED' })

    const { jobUrl, jobText: providedJobText, cvBase64, cvMimeType, cvFileName, skipAi = false, debug = false } = req.body || {}
    if ((!jobUrl && !providedJobText) || !cvBase64 || !cvMimeType) return res.status(400).json({ success: false, error: 'Missing required fields', code: 'MISSING_REQUIRED_FIELDS' })

    const supabase = getSupabaseAdmin()
    const [jobExtraction, cvText] = await Promise.all([
      providedJobText ? Promise.resolve({ text: cleanText(providedJobText, JOB_TEXT_LIMIT), provider: 'manual-paste' }) : fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])
    const jobText = jobExtraction.text

    if (!cvText || cvText.trim().length < 50) return res.status(400).json({ success: false, error: 'Could not extract enough text from your CV.', code: 'CV_TEXT_TOO_SHORT' })

    const quality = validateJobTextQuality(jobText, { source: providedJobText ? 'paste' : 'url', url: jobUrl })
    quality.extractionProvider = jobExtraction.provider
    quality.jinaTarget = jobExtraction.jinaTarget || null
    if (quality.blocked) return res.status(400).json({ success: false, error: quality.message, code: providedJobText ? 'JOB_TEXT_INCOMPLETE' : 'URL_EXTRACTION_WEAK', quality })

    const normalizedUrl = jobUrl ? normalizeUrlForCache(jobUrl) : ''
    const cvHash = hashContent('cv-v1', cvText.slice(0, CV_TEXT_LIMIT))
    const jobHash = jobUrl ? normalizedUrl : hashContent('job-v1', jobText.slice(0, JOB_TEXT_LIMIT))
    const cacheKey = hashContent(CACHE_VERSION, authUser.id, cvHash, jobHash)

    const cached = await readCachedAnalysis(supabase, authUser.id, cacheKey)
    if (cached) return res.status(200).json({ success: true, analysis: cached, cached: true, quality })

    let aiResult = {}
    let providerError = null
    if (!skipAi) {
      try { aiResult = await runClaudeAnalysis(jobText, cvText) }
      catch (error) { providerError = { code: error?.code || error?.type || 'AI_EXPLANATION_FAILED', message: error?.message || 'AI explanation failed' } }
    }

    const base = Object.keys(aiResult || {}).length ? aiResult : fallbackAnalysis(jobText, cvText, jobUrl, providerError?.message || 'AI explanation unavailable.')
    let analysis = applyDeterministicAts(base, jobText, cvText)
    analysis.job_url = jobUrl || null
    analysis.job_source = jobUrl ? 'url' : 'pasted'
    analysis.extraction_provider = jobExtraction.provider
    analysis.extraction_jina_target = jobExtraction.jinaTarget || null
    analysis.cv_preview = cleanText(cvText, 800)
    analysis.cv_preview_truncated = cvText.trim().length > 800
    analysis.job_text_quality = quality
    if (providerError) analysis.provider_error = providerError

    const savedRow = await saveAnalysis(supabase, authUser.id, cacheKey, analysis, jobUrl, cvFileName)
    return res.status(200).json({ success: true, analysis, savedRow, cached: false, quality, providerError: debug ? providerError : undefined })
  } catch (error) {
    const status = error?.statusCode || error?.status || 500
    return res.status(status >= 400 && status < 600 ? status : 500).json({ success: false, error: publicError(error), code: error?.code || 'ANALYZE_ACCURATE_FAILED', extractionAttempts: error?.extractionAttempts })
  }
}
