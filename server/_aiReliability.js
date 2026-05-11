export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isRetryableAiError(error) {
  const status = error?.status || error?.statusCode || error?.response?.status
  const type = String(error?.error?.type || error?.type || '').toLowerCase()
  const message = String(error?.error?.message || error?.message || '').toLowerCase()
  if ([408, 409, 425, 429, 500, 502, 503, 504, 529].includes(status)) return true
  if (type.includes('overload') || type.includes('rate_limit') || type.includes('timeout')) return true
  if (message.includes('overloaded') || message.includes('rate limit') || message.includes('timeout') || message.includes('temporarily')) return true
  return false
}

export function classifyAiError(error, feature = 'analysis') {
  const status = error?.status || error?.statusCode || error?.response?.status || 500
  const type = String(error?.error?.type || error?.type || '').toLowerCase()
  const providerMessage = error?.error?.message || error?.message || 'Unknown AI provider error'
  const lower = String(providerMessage).toLowerCase()

  if (status === 401 || status === 403 || lower.includes('api key')) {
    return { statusCode: 503, code: 'ai_auth_error', retryable: false, providerMessage, userMessage: 'The AI provider is not available because the server credentials need attention. Please try again later.' }
  }
  if (status === 429 || type.includes('rate_limit') || lower.includes('rate limit')) {
    return { statusCode: 503, code: 'ai_rate_limited', retryable: true, providerMessage, userMessage: 'The AI provider is temporarily busy. Please wait a moment and try again.' }
  }
  if (status === 402 || lower.includes('credit') || lower.includes('billing') || lower.includes('balance')) {
    return { statusCode: 503, code: 'ai_billing_unavailable', retryable: false, providerMessage, userMessage: 'AI processing is temporarily unavailable. The service owner needs to refresh the AI provider billing or credits.' }
  }
  if (status === 400 || lower.includes('too long') || lower.includes('maximum context') || lower.includes('prompt is too long')) {
    return { statusCode: 400, code: 'ai_input_too_long', retryable: false, providerMessage, userMessage: feature === 'cover_letter' ? 'The cover letter context is too long. Try generating it from a shorter analysis or remove extra notes.' : 'The job description or CV content is too long for the AI model. Paste a shorter version focused on responsibilities and requirements.' }
  }
  if (status === 529 || lower.includes('overloaded') || lower.includes('temporarily')) {
    return { statusCode: 503, code: 'ai_overloaded', retryable: true, providerMessage, userMessage: 'The AI provider is overloaded right now. Please try again in a few minutes.' }
  }
  return { statusCode: status >= 400 && status < 600 ? status : 500, code: 'ai_provider_error', retryable: isRetryableAiError(error), providerMessage, userMessage: feature === 'cover_letter' ? 'Cover letter generation failed because the AI provider returned an error. Please try again.' : 'Analysis failed because the AI provider returned an error. Please try again.' }
}

export function aiErrorPayload(error, feature = 'analysis') {
  const classified = classifyAiError(error, feature)
  return { error: classified.userMessage, code: classified.code, retryable: classified.retryable, provider_status: error?.status || error?.statusCode || null, statusCode: classified.statusCode }
}

export async function runWithAiRetry(operation, { attempts = 2, baseDelayMs = 700, shouldRetry = isRetryableAiError } = {}) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(attempt) }
    catch (error) {
      lastError = error
      if (attempt >= attempts || !shouldRetry(error)) break
      await sleep(baseDelayMs * attempt)
    }
  }
  throw lastError
}

export function extractJsonFromAiText(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) throw new Error('AI returned text without a JSON object.')
  return JSON.parse(cleaned.slice(first, last + 1).replace(/,\s*([}\]])/g, '$1'))
}

export function buildFallbackAnalysis({ jobText, cvText, jobUrl = null }) {
  const jobSnippet = String(jobText || '').replace(/\s+/g, ' ').trim()
  const cvSnippet = String(cvText || '').replace(/\s+/g, ' ').trim()
  const keywords = Array.from(new Set(jobSnippet.toLowerCase().match(/\b[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ+#.-]{3,}\b/g) || []))
    .filter(word => !['with', 'from', 'this', 'that', 'your', 'vous', 'pour', 'dans', 'avec', 'will', 'have', 'role', 'team'].includes(word))
    .slice(0, 10)
  const found = keywords.filter(word => cvSnippet.toLowerCase().includes(word)).slice(0, 8)
  const missing = keywords.filter(word => !found.includes(word)).slice(0, 6)
  const keywordScore = keywords.length ? Math.round((found.length / keywords.length) * 100) : 45
  const requirementScore = Math.max(35, Math.min(70, keywordScore))
  const displayScore = Math.round(keywordScore * 0.6 + requirementScore * 0.4)
  return {
    job_context: { title: 'Not specified', company: 'Not specified', location: 'Not specified', work_mode: 'unknown', contract_type: 'unknown', salary_range: 'Not specified', experience_required: 'Not specified', posted_date: 'Unknown', languages_required: [], apply_url: null, easy_apply: false, hiring_contact: null },
    job_summary: jobSnippet.slice(0, 240) || 'Job summary unavailable.',
    match_probability: displayScore,
    match_reasoning: 'Fallback score based on visible keyword overlap because the AI provider response could not be parsed.',
    seniority: { candidate_level: 'mid', job_level: 'mid', alignment: 'right_level', alignment_label: 'Needs review', alignment_reason: 'Fallback mode cannot reliably assess seniority.', candidate_years: 0, job_years_required: 0 },
    red_flags: ['AI fallback mode used — review manually before applying.'],
    salary_assessment: { specified: false, assessment: 'unknown', comment: 'Salary information was not assessed in fallback mode.' },
    salary_intelligence: null,
    verdict: displayScore >= 70 ? 'Possible match' : displayScore >= 50 ? 'Needs improvement' : 'Weak match',
    keyword_match: { score: keywordScore, found, missing_required: missing, missing_nice: [] },
    requirements_check: { score: requirementScore, met: found.slice(0, 5), unmet: missing.slice(0, 4) },
    format_warnings: [],
    critical_gaps: missing.slice(0, 3),
    quick_wins: missing.slice(0, 4).map(word => ({ tip: `Add relevant evidence for “${word}” if you have it.`, example: `Example: Delivered ${word}-related outcomes with measurable impact.` })),
    overall_verdict: displayScore >= 70 ? 'likely_passed' : displayScore >= 50 ? 'borderline' : 'likely_filtered',
    overall_reason: 'Fallback result based on keyword overlap. Run the analysis again later for the full AI review.',
    interview_prep: { likely_questions: [], your_edges: found.slice(0, 3), weak_spots: missing.slice(0, 3), salary_negotiation_hint: 'Review market salary manually.', show_prep: true },
    display_score: displayScore,
    job_url: jobUrl,
    job_source: jobUrl ? 'url' : 'pasted',
    ai_fallback: true
  }
}
