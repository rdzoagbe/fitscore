// Client-side safety net for the results view. Even though the API now blocks
// URL-blob extractions and filters URL fragments out of keywords, old cached
// analyses (saved before that fix) can still carry junk. These helpers keep that
// junk off the screen and let the UI honestly flag a low-confidence result.

// Mirrors the server's looksLikeUrlNoise: true when a "keyword" is really a piece
// of a URL / tracking query-string / percent-encoding rather than a real skill.
export function isUrlNoiseLabel(label = '') {
  const t = String(label || '').toLowerCase().trim()
  if (!t) return true
  if (/\b(https?|www|ftp)\b/.test(t)) return true
  if (/[a-z0-9-]+\.(com|net|org|io|ai|co|app|dev|fr|uk|de|es|eu|us|nl|it|pt|ca)\b/.test(t)) return true
  if (/linkedin|indeed|glassdoor|welcometothejungle|workday/.test(t)) return true
  if (/\b[0-9a-f]?2f[a-z0-9]*\b/.test(t)) return true   // %2F leftovers: 2f, 2fwww, 2fjobs, 2ffr
  if (/\b3a\b/.test(t)) return true                     // %3A leftover (the ":" in "https://")
  if (/\b(trk|utm[_a-z]*|ref|aero(-v\d+)?|sessionid|gclid|fbclid|session redirect)\b/.test(t)) return true
  if (/\b\d{5,}\b/.test(t)) return true                 // long numeric ids (job ids)
  return false
}

// Strip URL/query-string junk out of any array of display labels.
export function cleanLabels(labels = []) {
  return (Array.isArray(labels) ? labels : []).filter(label => label && !isUrlNoiseLabel(label))
}

// A result is "degraded" when we should NOT present its score as an authoritative
// ATS verdict: the AI review didn't run, the extracted job text was thin/blocked,
// no job identity was found, or the remaining keyword signal is junk/empty.
export function isDegradedAnalysis(data = {}) {
  if (!data) return { degraded: false, reasons: [] }
  const reasons = []

  const summary = String(data.job_summary || '').toLowerCase()
  const aiUnavailable = !!data.provider_error || summary.includes('ai explanation was unavailable') || summary.includes('deterministic ats scoring')
  if (aiUnavailable) reasons.push('The AI review did not run — this is a keyword-only estimate.')

  const quality = data.job_text_quality?.quality || data.quality?.quality
  if (quality === 'thin' || data.job_text_quality?.blocked) reasons.push('The job description we could read was thin or incomplete.')

  const title = data.job_context?.title || data.job_context?.job_title || data.job_title
  if (!title || ['not specified', 'not stated'].includes(String(title).toLowerCase())) reasons.push('We could not identify the job title from the source.')

  const found = [
    ...(data.keywords_analysis?.found_in_cv || []),
    ...(data.keyword_match?.found || [])
  ]
  const realFound = cleanLabels(found)
  const allFoundWereNoise = found.length > 0 && realFound.length === 0
  if (allFoundWereNoise) reasons.push('The extracted keywords looked like a link/redirect, not job content.')

  return { degraded: reasons.length > 0, reasons }
}
