import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

export const config = { maxDuration: 60 }

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const ANTHROPIC_TIMEOUT_MS = Number.parseInt(process.env.ANTHROPIC_TIMEOUT_MS || '42000', 10)
const JOB_TEXT_LIMIT = 5500
const CV_TEXT_LIMIT = 5500
const HOURLY_LIMIT = 15
const DAILY_LIMIT = 50
const WHITELIST_DAILY = 500
const WHITELIST = (process.env.RATE_LIMIT_WHITELIST || '').split(',').map(s => s.trim()).filter(Boolean)

const SYSTEM = `You are Joblytics ATS Intelligence.
Return ONLY strict valid JSON. No markdown. No prose outside JSON.
Use double quotes only. Do not include trailing commas. Do not include comments.

Analyze the CV against the job offer.
Important rules:
- Missing keywords, gaps and unmet requirements must be real job requirements, skills, tools, responsibilities, languages, certifications or measurable experience.
- Never list company names, brand names, location names, generic page words, posting dates, or isolated words as gaps.
- Do not invent experience. If the CV does not prove something, mark it as missing or needs proof.
- Keep arrays concise. Use short human-readable phrases.
- Scores must be integers from 0 to 100.

Return exactly this JSON shape:
{
  "job_context": {"title":"","company":"","location":"","work_mode":"remote|hybrid|onsite|unknown","contract_type":"CDI|CDD|freelance|internship|apprenticeship|temp|unknown","salary_range":"","experience_required":"","languages_required":[],"apply_url":null,"easy_apply":false,"hiring_contact":null},
  "job_summary":"",
  "match_probability":0,
  "match_reasoning":"",
  "display_score":0,
  "recruiter_shortlist":{"probability":0,"verdict":"strong_shortlist|possible_shortlist|unlikely_shortlist","reason":"","top_screening_factors":[],"likely_recruiter_concerns":[]},
  "next_best_action":{"action":"apply_now|improve_cv_first|prepare_interview|ask_recruiter_question|skip_or_low_priority","label":"","reason":"","steps":[]},
  "confidence":{"level":"high|medium|low","score":0,"reasons":[],"job_text_quality":"complete|partial|thin|blocked","cv_text_quality":"complete|partial|thin|scanned_or_poor"},
  "seniority":{"candidate_level":"intern|junior|mid|senior|lead|staff_principal|executive","job_level":"intern|junior|mid|senior|lead|staff_principal|executive","alignment":"right_level|stretch|reach|below_level|pivot","alignment_label":"","alignment_reason":"","candidate_years":0,"job_years_required":0},
  "keyword_match":{"score":0,"found":[],"missing_required":[],"missing_nice":[],"keyword_stuffing_risk":"low|medium|high"},
  "requirements_check":{"score":0,"must_have":[],"nice_to_have":[],"met":[],"unmet":[]},
  "semantic_fit":{"score":0,"matched_responsibilities":[],"weak_or_missing_responsibilities":[],"domain_fit":"strong|moderate|weak","domain_reason":""},
  "seniority_fit":{"score":0,"risk":"none|slight_stretch|overqualified|underqualified|track_mismatch"},
  "experience_depth":{"score":0,"hands_on":"strong|moderate|weak|unclear","leadership":"strong|moderate|weak|not_required|unclear","scale":"strong|moderate|weak|unclear","metrics":"strong|moderate|weak|missing","ownership":"strong|moderate|weak|unclear","proof_summary":""},
  "proof_gaps":[],
  "hidden_expectations":[],
  "red_flags":[],
  "salary_assessment":{"specified":false,"assessment":"below_market|market|above_market|unknown|not_specified","comment":""},
  "salary_intelligence":null,
  "verdict":"",
  "overall_verdict":"likely_filtered|borderline|likely_passed",
  "overall_reason":"",
  "critical_gaps":[],
  "format_warnings":[],
  "quick_wins":[],
  "rewrite_priorities":[],
  "jobseeker_strategy":{"apply_message_angle":"","follow_up_timing":"","questions_to_ask_recruiter":[],"skip_reason":null},
  "interview_prep":{"show_prep":true,"likely_questions":[],"your_edges":[],"weak_spots":[],"salary_negotiation_hint":""}
}`

function createTimer() {
  const start = Date.now()
  let last = start
  const steps = []
  return {
    mark(step, extra = {}) {
      const now = Date.now()
      const item = { step, stepMs: now - last, totalMs: now - start, ...extra }
      last = now
      steps.push(item)
      console.log('[ANALYZE_V4_TIMING]', JSON.stringify(item))
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

function cleanText(value = '', limit = 7000) {
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
    const err = new Error(`${restrictedBoard || 'This job page'} could not be reached quickly from URL mode. Please use Paste mode and paste the job description.`)
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
    const err = new Error(`${restrictedBoard || 'This job page'} did not expose enough readable job text. Please use Paste mode and paste the job description.`)
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

function stripAccents(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function clampScore(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseInt(value, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function isInternalErrorText(value = '') {
  return /expected.*json|property value|position \d+|line \d+ column|malformed json|parse failed|unexpected token|unterminated string|ANTHROPIC_|APIConnectionTimeoutError/i.test(String(value || ''))
}

const GENERIC_NOISE = new Set([
  'responsable','client','clients','petit','bateau','publie','publié','publication','offre','emploi','poste','profil','mission','missions','description','entreprise','groupe','localisation','france','paris','cdi','cdd','stage','alternance','experience','expérience','candidature','recrutement','recruitment','apply','application','job','jobs','career','careers','company','role','candidate','candidat','page','site','www','https','http'
])

function isLowSignalItem(value = '', strict = false) {
  const raw = String(value || '').trim()
  const normalized = stripAccents(raw).toLowerCase().replace(/[^a-z0-9+#.\s-]/g, '').trim()
  if (!normalized || normalized.length < 3) return true
  if (isInternalErrorText(raw)) return true
  if (/^\d+$/.test(normalized)) return true
  if (GENERIC_NOISE.has(normalized)) return true
  const words = normalized.split(/\s+/).filter(Boolean)
  if (strict && words.length === 1 && normalized.length < 5) return true
  if (strict && words.length === 1 && GENERIC_NOISE.has(words[0])) return true
  return false
}

function normalizeItem(item) {
  if (typeof item === 'string') return item.trim()
  if (item && typeof item === 'object') return String(item.label || item.title || item.text || item.requirement || item.skill || item.tip || item.area || '').trim()
  return ''
}

function cleanList(values = [], limit = 8, options = {}) {
  const strict = !!options.strict
  const seen = new Set()
  const input = Array.isArray(values) ? values : []
  const out = []
  for (const item of input) {
    const value = normalizeItem(item).replace(/^[-–•✓✗x]\s*/i, '').replace(/\s+/g, ' ').trim()
    if (!value || value.length > 180) continue
    if (isLowSignalItem(value, strict)) continue
    const key = stripAccents(value).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
    if (out.length >= limit) break
  }
  return out
}

function extractSkillKeywords(text = '') {
  const source = cleanText(text, 9000)
  const lower = stripAccents(source).toLowerCase()
  const skills = [
    'Microsoft 365','Office 365','Azure','AWS','GCP','Intune','Autopilot','Entra ID','Azure AD','Active Directory','Windows 11','macOS','iOS','Android','Jamf','Defender','EDR','MDM','MFA','SSO','SAML','OAuth','Okta','ServiceNow','Jira','Zendesk','Freshdesk','ITIL','SLA','SLO','KPI','PowerShell','Python','SQL','Power BI','SharePoint','Teams','Exchange','networking','firewall','VPN','LAN','WAN','Wi-Fi','cybersecurity','security','compliance','GDPR','ISO 27001','project management','change management','incident management','problem management','vendor management','budget management','stakeholder management','leadership','team management','support','helpdesk','infrastructure','cloud','ERP','CRM','Yardi','ticketing','kiosk','box office','e-commerce','API','integration','analytics','reporting','monitoring','backup','disaster recovery'
  ]
  const found = []
  for (const skill of skills) {
    const key = stripAccents(skill).toLowerCase()
    if (lower.includes(key) && !found.includes(skill)) found.push(skill)
  }
  return found.slice(0, 18)
}

function salientTokens(value = '') {
  const stop = new Set([...GENERIC_NOISE, 'avec','pour','dans','vous','nous','les','des','the','and','for','with','your','our','une','aux','sur','qui','que','are','this','that','from','avoir','etre','être','plus','afin','their','will','can','all','notre','votre'])
  return stripAccents(value).toLowerCase().match(/[a-z0-9+#.]{3,}/g)?.filter(w => !stop.has(w)) || []
}

function matchesRequirementInCv(requirement, cvLower) {
  const tokens = salientTokens(requirement)
  if (!tokens.length) return false
  const needed = tokens.length <= 2 ? 1 : Math.ceil(tokens.length * 0.45)
  let hits = 0
  for (const token of tokens) if (cvLower.includes(token)) hits += 1
  return hits >= needed
}

function splitCandidateRequirementLines(text = '') {
  return cleanText(text, 9000)
    .split(/\n|(?<=[.!?])\s+/)
    .map(line => line.replace(/^[-–•*\d.)\s]+/, '').trim())
    .filter(line => line.length >= 18 && line.length <= 180)
}

function extractRequirementPhrases(jobText = '') {
  const lines = splitCandidateRequirementLines(jobText)
  const requirementPattern = /experience|required|requirement|qualification|skill|knowledge|proficient|manage|lead|support|deploy|maintain|monitor|security|cloud|infrastructure|project|stakeholder|vendor|budget|team|service|incident|maitrise|maîtrise|competence|compétence|connaissance|exig|requis|souhait|gestion|support|anglais|français|anglais|equipe|équipe|projet|securite|sécurité/i
  const picked = []
  for (const line of lines) {
    if (!requirementPattern.test(line)) continue
    if (isLowSignalItem(line, false)) continue
    picked.push(line)
  }
  const skills = extractSkillKeywords(jobText)
  return cleanList([...picked, ...skills], 12, { strict: true })
}

function detectTitle(jobText = '') {
  const candidates = cleanText(jobText, 900).split(/\n|\.|-/).map(s => s.trim()).filter(Boolean)
  return candidates.find(line => line.length >= 4 && line.length <= 90 && !isLowSignalItem(line, false)) || 'Not specified'
}

function safeVerdict(score) {
  if (score >= 75) return 'likely_passed'
  if (score >= 50) return 'borderline'
  return 'likely_filtered'
}

function buildLocalAnalysis(jobText, cvText, jobUrl, reason = 'AI analysis was unavailable, so Joblytics used deterministic requirement matching.') {
  const cvClean = cleanText(cvText, 9000)
  const cvLower = stripAccents(cvClean).toLowerCase()
  const requirements = extractRequirementPhrases(jobText)
  const skills = extractSkillKeywords(jobText)
  const mustHave = cleanList(requirements.length ? requirements : skills, 10, { strict: true })
  const met = mustHave.filter(req => matchesRequirementInCv(req, cvLower)).slice(0, 6)
  const unmet = mustHave.filter(req => !matchesRequirementInCv(req, cvLower)).slice(0, 6)
  const foundSkills = skills.filter(skill => cvLower.includes(stripAccents(skill).toLowerCase())).slice(0, 10)
  const missingSkills = skills.filter(skill => !cvLower.includes(stripAccents(skill).toLowerCase())).slice(0, 8)
  const denominator = Math.max(mustHave.length, 1)
  const requirementScore = clampScore((met.length / denominator) * 100, mustHave.length ? 45 : 35)
  const keywordScore = clampScore((foundSkills.length / Math.max(foundSkills.length + missingSkills.length, 1)) * 100, requirementScore)
  const displayScore = clampScore(Math.round(requirementScore * 0.55 + keywordScore * 0.30 + (cvClean.length > 1600 ? 15 : 8)), 45)
  const recruiterVerdict = displayScore >= 75 ? 'strong_shortlist' : displayScore >= 52 ? 'possible_shortlist' : 'unlikely_shortlist'
  const fallbackNotice = 'AI provider output could not be used safely. This result is based on extracted requirements and CV text only.'

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
    job_summary: 'Joblytics completed a safe fallback analysis using extracted requirements from the job description and evidence found in the CV.',
    match_probability: displayScore,
    match_reasoning: unmet.length ? `The CV needs clearer evidence for ${unmet.slice(0, 3).join(', ')}.` : 'The CV shows evidence for the main extracted requirements.',
    display_score: displayScore,
    recruiter_shortlist: {
      probability: displayScore,
      verdict: recruiterVerdict,
      reason: unmet.length ? 'Recruiters may hesitate because some role requirements are not clearly proven in the CV.' : 'The main extracted requirements appear to be supported by the CV.',
      top_screening_factors: met.slice(0, 5),
      likely_recruiter_concerns: unmet.slice(0, 5)
    },
    next_best_action: {
      action: displayScore >= 75 ? 'apply_now' : displayScore >= 52 ? 'improve_cv_first' : 'skip_or_low_priority',
      label: displayScore >= 75 ? 'Apply with targeted positioning' : 'Improve CV evidence first',
      reason: unmet.length ? `Strengthen proof for: ${unmet.slice(0, 4).join(', ')}.` : 'Keep the CV evidence clear and measurable before applying.',
      steps: ['Add evidence only for requirements you can prove', 'Use job wording naturally in relevant bullets', 'Quantify scope, users, systems, budget or outcomes where possible']
    },
    confidence: { level: 'low', score: 48, reasons: [fallbackNotice], job_text_quality: jobText.length > 1000 ? 'partial' : 'thin', cv_text_quality: cvClean.length > 1000 ? 'partial' : 'thin' },
    seniority: { candidate_level: 'senior', job_level: 'senior', alignment: 'right_level', alignment_label: 'Needs AI confirmation', alignment_reason: 'Fallback mode cannot reliably infer seniority depth.', candidate_years: 0, job_years_required: 0 },
    keyword_match: { score: keywordScore, found: foundSkills, missing_required: missingSkills, missing_nice: [], keyword_stuffing_risk: 'low' },
    requirements_check: { score: requirementScore, must_have: mustHave, nice_to_have: [], met, unmet },
    semantic_fit: { score: displayScore, matched_responsibilities: met.slice(0, 6), weak_or_missing_responsibilities: unmet.slice(0, 6), domain_fit: displayScore >= 65 ? 'moderate' : 'weak', domain_reason: 'Estimated from requirement evidence only.' },
    seniority_fit: { score: 60, risk: 'none' },
    experience_depth: { score: 55, hands_on: 'unclear', leadership: 'unclear', scale: 'unclear', metrics: 'unclear', ownership: 'unclear', proof_summary: 'Fallback mode checks evidence presence but cannot fully assess depth.' },
    proof_gaps: unmet.slice(0, 6),
    hidden_expectations: [],
    red_flags: [],
    salary_assessment: { specified: false, assessment: 'unknown', comment: 'Salary not assessed in fallback mode.' },
    salary_intelligence: null,
    verdict: displayScore >= 75 ? 'Good apparent fit' : displayScore >= 52 ? 'Possible fit with edits' : 'Weak apparent fit',
    overall_verdict: safeVerdict(displayScore),
    overall_reason: unmet.length ? 'Some important requirements need stronger proof before applying.' : 'The CV appears aligned with the main extracted requirements.',
    critical_gaps: unmet.slice(0, 4),
    format_warnings: reason ? ['This analysis used safe fallback mode. Re-run once if the result looks too generic.'] : [],
    quick_wins: ['Replace generic bullets with proof tied to the job requirements', 'Add measurable outcomes to the most relevant experience', 'Mirror key job wording only where it is true'],
    rewrite_priorities: unmet.slice(0, 6),
    jobseeker_strategy: { apply_message_angle: 'Position around the strongest proven requirements.', follow_up_timing: 'Follow up after 3-5 business days.', questions_to_ask_recruiter: [], skip_reason: null },
    interview_prep: { show_prep: true, likely_questions: unmet.slice(0, 4).map(item => `Can you give an example of your experience with ${item}?`), your_edges: met.slice(0, 5), weak_spots: unmet.slice(0, 5), salary_negotiation_hint: 'Confirm scope and package before giving a final number.' },
    job_url: jobUrl || null,
    job_source: jobUrl ? 'url' : 'pasted',
    cv_preview: cvClean.slice(0, 800).replace(/\s+/g, ' ').trim(),
    cv_preview_truncated: cvClean.length > 800,
    analysis_version: 'ats-intelligence-v4-fallback',
    fallback_used: true,
    fallback_notice: fallbackNotice
  }
}

function extractJsonObject(raw = '') {
  const text = String(raw || '').trim().replace(/```json|```/g, '').trim()
  try { return JSON.parse(text) } catch {}
  const start = text.indexOf('{')
  if (start < 0) throw new Error('AI_JSON_MISSING_OBJECT')
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const char = text[i]
    if (escaped) { escaped = false; continue }
    if (char === '\\') { escaped = true; continue }
    if (char === '"') { inString = !inString; continue }
    if (inString) continue
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) {
      const candidate = text.slice(start, i + 1).replace(/,\s*([}\]])/g, '$1')
      return JSON.parse(candidate)
    }
  }
  throw new Error('AI_JSON_INCOMPLETE_OBJECT')
}

function getHttpStatus(e) {
  const status = e?.statusCode || e?.status || e?.response?.status
  if (Number.isInteger(status) && status >= 400 && status < 600) return status
  return 500
}

function providerError(e) {
  const status = getHttpStatus(e)
  return { status, name: e?.name || 'Error', code: e?.code || e?.type || e?.error?.type || 'ANALYSIS_FAILED', message: e?.message || 'Analysis failed' }
}

function publicErrorMessage(e, status) {
  if (status === 401) return 'Anthropic authentication failed. Check ANTHROPIC_API_KEY in Vercel environment variables.'
  if (status === 403) return 'Anthropic rejected the request. Check API key permissions and workspace access.'
  if (status === 429) return 'Anthropic rate limit or credit limit reached. Try again later or check billing/limits.'
  if (/timeout/i.test(e?.message || '') || e?.name === 'APIConnectionTimeoutError' || e?.code === 'ETIMEDOUT') return 'Analysis took too long. Try again with a shorter job description.'
  if (/AI_JSON_|JSON|parse/i.test(e?.message || '')) return 'AI output could not be safely parsed.'
  return e?.message || 'Analysis failed'
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
  const prompt = `JOB OFFER:\n${jobText.slice(0, JOB_TEXT_LIMIT)}\n\n---\n\nCV:\n${cvText.slice(0, CV_TEXT_LIMIT)}\n\nReturn strict valid JSON only. Remember: gaps must be real requirements, not company names, locations, dates or generic words.`
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2600,
    temperature: 0,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }]
  }, { timeout: Number.isFinite(ANTHROPIC_TIMEOUT_MS) ? ANTHROPIC_TIMEOUT_MS : 42000 })
  const raw = message.content.map(block => block.text || '').join('').trim()
  return extractJsonObject(raw)
}

function normalizeAnalysis(raw, jobUrl, cvText, jobText) {
  const fallback = buildLocalAnalysis(jobText, cvText, jobUrl, '')
  const analysis = { ...fallback, ...(raw && typeof raw === 'object' ? raw : {}) }
  const mergeObj = (key) => { analysis[key] = { ...(fallback[key] || {}), ...(raw?.[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key]) ? raw[key] : {}) } }
  ;['job_context','recruiter_shortlist','next_best_action','confidence','seniority','keyword_match','requirements_check','semantic_fit','seniority_fit','experience_depth','salary_assessment','jobseeker_strategy','interview_prep'].forEach(mergeObj)

  analysis.keyword_match.found = cleanList(analysis.keyword_match.found, 10, { strict: false })
  analysis.keyword_match.missing_required = cleanList(analysis.keyword_match.missing_required, 8, { strict: true })
  analysis.keyword_match.missing_nice = cleanList(analysis.keyword_match.missing_nice, 6, { strict: true })
  analysis.requirements_check.must_have = cleanList(analysis.requirements_check.must_have, 12, { strict: true })
  analysis.requirements_check.nice_to_have = cleanList(analysis.requirements_check.nice_to_have, 10, { strict: true })
  analysis.requirements_check.met = cleanList(analysis.requirements_check.met, 6, { strict: false })
  analysis.requirements_check.unmet = cleanList(analysis.requirements_check.unmet, 6, { strict: true })
  analysis.semantic_fit.matched_responsibilities = cleanList(analysis.semantic_fit.matched_responsibilities, 6, { strict: false })
  analysis.semantic_fit.weak_or_missing_responsibilities = cleanList(analysis.semantic_fit.weak_or_missing_responsibilities, 6, { strict: true })
  analysis.proof_gaps = cleanList(analysis.proof_gaps, 6, { strict: true })
  analysis.hidden_expectations = cleanList(analysis.hidden_expectations, 6, { strict: true })
  analysis.red_flags = cleanList(analysis.red_flags, 4, { strict: false })
  analysis.critical_gaps = cleanList(analysis.critical_gaps, 4, { strict: true })
  analysis.format_warnings = cleanList(analysis.format_warnings, 3, { strict: false })
  analysis.quick_wins = cleanList(analysis.quick_wins, 5, { strict: false })
  analysis.rewrite_priorities = cleanList(analysis.rewrite_priorities, 6, { strict: true })
  analysis.recruiter_shortlist.top_screening_factors = cleanList(analysis.recruiter_shortlist.top_screening_factors, 5, { strict: false })
  analysis.recruiter_shortlist.likely_recruiter_concerns = cleanList(analysis.recruiter_shortlist.likely_recruiter_concerns, 5, { strict: true })
  analysis.next_best_action.steps = cleanList(analysis.next_best_action.steps, 4, { strict: false })
  analysis.confidence.reasons = cleanList(analysis.confidence.reasons, 4, { strict: false })

  if (!analysis.critical_gaps.length && analysis.requirements_check.unmet.length) analysis.critical_gaps = analysis.requirements_check.unmet.slice(0, 4)
  if (!analysis.proof_gaps.length && analysis.recruiter_shortlist.likely_recruiter_concerns.length) analysis.proof_gaps = analysis.recruiter_shortlist.likely_recruiter_concerns.slice(0, 4)
  if (!analysis.keyword_match.missing_required.length && analysis.requirements_check.unmet.length) analysis.keyword_match.missing_required = analysis.requirements_check.unmet.slice(0, 6)

  const badReason = isInternalErrorText(analysis.recruiter_shortlist.reason)
  if (badReason) analysis.recruiter_shortlist.reason = analysis.requirements_check.unmet.length ? 'Some job requirements are not clearly proven in the CV.' : 'Recruiter fit was estimated from the available job and CV text.'
  if (isInternalErrorText(analysis.job_summary)) analysis.job_summary = 'Joblytics analyzed the CV against the available job description and extracted the main fit signals.'
  if (isInternalErrorText(analysis.overall_reason)) analysis.overall_reason = 'The CV should be improved where requirements are missing or weakly evidenced.'

  analysis.display_score = clampScore(analysis.display_score, fallback.display_score)
  analysis.match_probability = clampScore(analysis.match_probability, analysis.display_score)
  analysis.keyword_match.score = clampScore(analysis.keyword_match.score, fallback.keyword_match.score)
  analysis.requirements_check.score = clampScore(analysis.requirements_check.score, fallback.requirements_check.score)
  analysis.semantic_fit.score = clampScore(analysis.semantic_fit.score, fallback.semantic_fit.score)
  analysis.seniority_fit.score = clampScore(analysis.seniority_fit.score, fallback.seniority_fit.score)
  analysis.experience_depth.score = clampScore(analysis.experience_depth.score, fallback.experience_depth.score)
  analysis.recruiter_shortlist.probability = clampScore(analysis.recruiter_shortlist.probability, analysis.match_probability)
  analysis.confidence.score = clampScore(analysis.confidence.score, 70)

  if (!['high', 'medium', 'low'].includes(analysis.confidence.level)) analysis.confidence.level = analysis.confidence.score >= 80 ? 'high' : analysis.confidence.score >= 55 ? 'medium' : 'low'
  if (!['strong_shortlist', 'possible_shortlist', 'unlikely_shortlist'].includes(analysis.recruiter_shortlist.verdict)) analysis.recruiter_shortlist.verdict = analysis.recruiter_shortlist.probability >= 75 ? 'strong_shortlist' : analysis.recruiter_shortlist.probability >= 50 ? 'possible_shortlist' : 'unlikely_shortlist'
  if (!['apply_now', 'improve_cv_first', 'prepare_interview', 'ask_recruiter_question', 'skip_or_low_priority'].includes(analysis.next_best_action.action)) analysis.next_best_action.action = analysis.display_score >= 78 ? 'apply_now' : analysis.display_score >= 55 ? 'improve_cv_first' : 'skip_or_low_priority'
  if (!['likely_filtered', 'borderline', 'likely_passed'].includes(analysis.overall_verdict)) analysis.overall_verdict = safeVerdict(analysis.display_score)

  const cvClean = cleanText(cvText, 9000)
  analysis.job_url = jobUrl || null
  analysis.job_source = jobUrl ? 'url' : 'pasted'
  analysis.job_title = analysis.job_context?.title || null
  analysis.cv_preview = cvClean.slice(0, 800).replace(/\s+/g, ' ').trim()
  analysis.cv_preview_truncated = cvClean.length > 800
  analysis.analysis_version = 'ats-intelligence-v4'
  analysis.fallback_used = false
  return analysis
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

  const timer = createTimer()

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
      return res.status(200).json({ success: true, analysis: normalizeAnalysis(cached, jobUrl, cvText, jobText), cached: true, rateLimit, debug: debug ? timer.steps() : undefined })
    }

    let analysis
    let aiProviderError = null
    if (skipAi) {
      analysis = buildLocalAnalysis(jobText, cvText, jobUrl, 'AI skipped by request.')
    } else {
      try {
        timer.mark('before_claude', { model: DEFAULT_MODEL, timeoutMs: ANTHROPIC_TIMEOUT_MS })
        const aiResult = await runClaudeAnalysis(jobText, cvText)
        timer.mark('after_claude')
        analysis = normalizeAnalysis(aiResult, jobUrl, cvText, jobText)
      } catch (e) {
        aiProviderError = providerError(e)
        console.error('Claude analysis failed:', JSON.stringify(aiProviderError))
        analysis = buildLocalAnalysis(jobText, cvText, jobUrl, publicErrorMessage(e, aiProviderError.status))
        analysis.provider_error = debug ? aiProviderError : undefined
      }
    }

    const savedRow = await saveAnalysis(supabase, userId, cacheKey, analysis, jobUrl, cvFileName)
    timer.mark('success', { fallback: !!aiProviderError || !!skipAi })
    return res.status(200).json({ success: true, analysis, savedRow, fallback: !!aiProviderError || !!skipAi, providerError: debug ? aiProviderError : undefined, rateLimit, debug: debug ? timer.steps() : undefined })
  } catch (e) {
    const status = e.statusCode || getHttpStatus(e)
    const details = providerError(e)
    console.error('Analyze v4 handler error:', JSON.stringify(details))
    return res.status(status).json({ success: false, error: publicErrorMessage(e, status), code: details.code, details, debug: timer.steps() })
  }
}
