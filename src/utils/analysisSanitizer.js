const INTERNAL_ERROR_RE = /expected.*json|property value|position \d+|line \d+ column|malformed json|parse failed|unexpected token|unterminated string|ANTHROPIC_|APIConnectionTimeoutError/i

const GENERIC_NOISE = new Set([
  'responsable','client','clients','petit','bateau','publié','publie','publication','offre','emploi','poste','profil','mission','missions','description','entreprise','groupe','localisation','france','paris','cdi','cdd','stage','alternance','experience','expérience','candidature','recrutement','recruitment','apply','application','job','jobs','career','careers','company','role','candidate','candidat','page','site','www','https','http'
])

function stripAccents(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function isInternalErrorText(value = '') {
  return INTERNAL_ERROR_RE.test(String(value || ''))
}

function normalizeItem(item) {
  if (typeof item === 'string') return item.trim()
  if (item && typeof item === 'object') return String(item.label || item.title || item.text || item.requirement || item.skill || item.tip || item.area || '').trim()
  return ''
}

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

function cleanList(values = [], limit = 8, strict = false) {
  const input = Array.isArray(values) ? values : []
  const seen = new Set()
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

function safeObj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function cloneAnalysis(input) {
  if (typeof structuredClone === 'function') return structuredClone(input)
  return JSON.parse(JSON.stringify(input))
}

export function sanitizeAnalysisForDisplay(input) {
  if (!input || typeof input !== 'object') return input

  const data = cloneAnalysis(input)

  data.keyword_match = safeObj(data.keyword_match)
  data.requirements_check = safeObj(data.requirements_check)
  data.semantic_fit = safeObj(data.semantic_fit)
  data.recruiter_shortlist = safeObj(data.recruiter_shortlist)
  data.confidence = safeObj(data.confidence)

  data.keyword_match.found = cleanList(data.keyword_match.found, 10, false)
  data.keyword_match.missing_required = cleanList(data.keyword_match.missing_required, 8, true)
  data.keyword_match.missing_nice = cleanList(data.keyword_match.missing_nice, 6, true)
  data.requirements_check.must_have = cleanList(data.requirements_check.must_have, 12, true)
  data.requirements_check.nice_to_have = cleanList(data.requirements_check.nice_to_have, 10, true)
  data.requirements_check.met = cleanList(data.requirements_check.met, 6, false)
  data.requirements_check.unmet = cleanList(data.requirements_check.unmet, 6, true)
  data.semantic_fit.matched_responsibilities = cleanList(data.semantic_fit.matched_responsibilities, 6, false)
  data.semantic_fit.weak_or_missing_responsibilities = cleanList(data.semantic_fit.weak_or_missing_responsibilities, 6, true)
  data.proof_gaps = cleanList(data.proof_gaps, 6, true)
  data.hidden_expectations = cleanList(data.hidden_expectations, 6, true)
  data.critical_gaps = cleanList(data.critical_gaps, 4, true)
  data.red_flags = cleanList(data.red_flags, 4, false)
  data.format_warnings = cleanList(data.format_warnings, 3, false)
  data.quick_wins = cleanList(data.quick_wins, 5, false)
  data.rewrite_priorities = cleanList(data.rewrite_priorities, 6, true)
  data.recruiter_shortlist.top_screening_factors = cleanList(data.recruiter_shortlist.top_screening_factors, 5, false)
  data.recruiter_shortlist.likely_recruiter_concerns = cleanList(data.recruiter_shortlist.likely_recruiter_concerns, 5, true)
  data.confidence.reasons = cleanList(data.confidence.reasons, 4, false)

  if (!data.critical_gaps.length && data.requirements_check.unmet.length) data.critical_gaps = data.requirements_check.unmet.slice(0, 4)
  if (!data.proof_gaps.length && data.recruiter_shortlist.likely_recruiter_concerns.length) data.proof_gaps = data.recruiter_shortlist.likely_recruiter_concerns.slice(0, 4)
  if (!data.keyword_match.missing_required.length && data.requirements_check.unmet.length) data.keyword_match.missing_required = data.requirements_check.unmet.slice(0, 6)

  if (isInternalErrorText(data.job_summary)) data.job_summary = 'Joblytics analyzed the CV against the available job description and extracted the main fit signals.'
  if (isInternalErrorText(data.overall_reason)) data.overall_reason = 'The CV should be improved where requirements are missing or weakly evidenced.'
  if (isInternalErrorText(data.match_reasoning)) data.match_reasoning = 'The match was estimated from CV evidence, keywords and job requirements.'
  if (isInternalErrorText(data.recruiter_shortlist.reason)) data.recruiter_shortlist.reason = data.requirements_check.unmet.length ? 'Some job requirements are not clearly proven in the CV.' : 'Recruiter fit was estimated from the available job and CV text.'

  return data
}
