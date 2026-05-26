const STOPWORDS = new Set([
  'with','from','that','this','your','you','our','the','and','for','are','will','have','has','had','into','about','over','under','within','their','them','they','role','job','work','team','teams','business','candidate','profile','experience','skills','required','requirements','mission','missions','poste','profil','avec','dans','pour','vous','nous','les','des','une','aux','sur','qui','que','est','sont','être','avoir','plus','afin','ainsi','candidat','expérience','compétences','responsibilities','responsabilites','responsabilités'
])

const TECH_TERMS = [
  'active directory','azure ad','entra id','microsoft 365','office 365','intune','autopilot','defender','jamf','sccm','endpoint manager','sharepoint','teams','exchange','powershell','graph api','azure','aws','gcp','cloud','terraform','ansible','kubernetes','docker','ci/cd','devops','sre','itil','sla','slo','kpi','servicenow','jira','zendesk','freshdesk','sql','power bi','power platform','crm','erp','yardi','api','integration','security','cybersecurity','network','firewall','vpn','identity','iam','sso','mfa','windows','linux','macos','helpdesk','service desk','support','incident','change management','problem management','asset management','budget','vendor','supplier','run','mco','production','infrastructure','architecture','migration','project management','stakeholder','leadership','manager','management','team management','recruitment','onboarding','monitoring','availability','disaster recovery','backup','compliance','gdpr','iso 27001','ticketing','ticketing system','data center','datacenter','hardware','networking','o365','mdm','edr','xdr','bcp','drp','business continuity','react','vue','angular','next.js','node.js','typescript','javascript','python','java','c#','php','ruby','html','css','tailwind','firebase','supabase','postgresql','mysql','mongodb','rest api','graphql'
]

const SYNONYM_GROUPS = [
  ['microsoft 365','office 365','o365','m365'],
  ['azure ad','entra id'],
  ['intune','endpoint manager','microsoft endpoint manager'],
  ['autopilot','windows autopilot'],
  ['service desk','helpdesk','it support','technical support'],
  ['jira','atlassian jira'],
  ['servicenow','service now'],
  ['ci/cd','continuous integration','continuous delivery'],
  ['data center','datacenter'],
  ['sso','single sign-on','single sign on'],
  ['mfa','multi-factor authentication','multifactor authentication'],
  ['edr','endpoint detection and response'],
  ['bcp','business continuity'],
  ['drp','disaster recovery'],
  ['crm','customer relationship management'],
  ['erp','enterprise resource planning'],
  ['api','rest api'],
  ['react','react.js','reactjs'],
  ['vue','vue.js','vuejs'],
  ['node.js','nodejs'],
  ['next.js','nextjs'],
  ['javascript','js'],
  ['typescript','ts'],
  ['postgresql','postgres'],
  ['power bi','powerbi']
]

const ROLE_LEVELS = [
  { level: 'executive', terms: ['head of','director','directeur','vp','chief','cto','cio'] },
  { level: 'manager', terms: ['manager','responsable','lead','team leader','chef','supervisor','supervise'] },
  { level: 'senior', terms: ['senior','expert','principal','specialist','référent'] },
  { level: 'mid', terms: ['engineer','analyst','technician','consultant','administrator','developer'] }
]

function clean(value = '') {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function titleCase(value = '') {
  const known = { 'itil': 'ITIL', 'sla': 'SLA', 'slo': 'SLO', 'kpi': 'KPI', 'aws': 'AWS', 'gcp': 'GCP', 'api': 'API', 'iam': 'IAM', 'sso': 'SSO', 'mfa': 'MFA', 'edr': 'EDR', 'xdr': 'XDR', 'gdpr': 'GDPR', 'sql': 'SQL', 'crm': 'CRM', 'erp': 'ERP', 'mdm': 'MDM', 'mco': 'MCO', 'bcp': 'BCP', 'drp': 'DRP', 'ci/cd': 'CI/CD', 'html': 'HTML', 'css': 'CSS', 'c#': 'C#' }
  const normalized = clean(value)
  if (known[normalized]) return known[normalized]
  return String(value || '').trim().split(' ').map(part => known[clean(part)] || part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function unique(items = [], limit = 50) {
  const seen = new Set()
  const out = []
  for (const raw of items) {
    const item = String(raw || '').trim()
    if (!item) continue
    const key = clean(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

function clamp(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function tokenise(text = '') {
  return clean(text).match(/[a-z0-9+#.\/-]{3,}/g)?.filter(token => !STOPWORDS.has(token)) || []
}

function countOccurrences(text = '', term = '') {
  const haystack = clean(text)
  const needle = clean(term)
  if (!needle) return 0
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (haystack.match(new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'g')) || []).length
}

function hasTerm(text = '', term = '') {
  return countOccurrences(text, term) > 0
}

function topTerms(text = '', limit = 18) {
  const counts = new Map()
  for (const token of tokenise(text)) counts.set(token, (counts.get(token) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word]) => word).slice(0, limit)
}

function canonicalSkill(skill = '') {
  const normalized = clean(skill)
  for (const group of SYNONYM_GROUPS) {
    if (group.map(clean).includes(normalized)) return titleCase(group[0])
  }
  return titleCase(skill)
}

function aliasesForSkill(skill = '') {
  const normalized = clean(skill)
  const group = SYNONYM_GROUPS.find(items => items.map(clean).includes(normalized))
  return group ? group.map(canonicalSkill) : [canonicalSkill(skill)]
}

function oneToThreeWords(value = '') {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  return words.length >= 1 && words.length <= 3
}

function extractSkills(text = '', { strict = false } = {}) {
  const lower = clean(text)
  const foundTech = TECH_TERMS.filter(term => lower.includes(clean(term))).map(canonicalSkill)
  if (strict) return unique(foundTech.filter(oneToThreeWords), 40)
  const frequent = topTerms(text, 24).filter(term => term.length >= 4 && oneToThreeWords(term)).map(titleCase)
  return unique([...foundTech, ...frequent], 40)
}

function extractYears(text = '') {
  const found = []
  const patterns = [/(\d{1,2})\s*\+?\s*(?:years|yrs|ans|annees|années)/gi, /(?:minimum|min\.?|at least|au moins)\s*(\d{1,2})/gi]
  for (const pattern of patterns) {
    for (const match of String(text).matchAll(pattern)) {
      const n = parseInt(match[1], 10)
      if (Number.isFinite(n) && n > 0 && n < 40) found.push(n)
    }
  }
  return found.length ? Math.max(...found) : 0
}

function extractDateRangeYears(text = '') {
  const currentYear = new Date().getFullYear()
  const ranges = [...String(text || '').matchAll(/((?:19|20)\d{2})\s*(?:-|–|—|to|au|à)\s*((?:19|20)\d{2}|present|current|today|aujourd'hui|actuel)/gi)]
  let total = 0
  const spans = []
  for (const match of ranges) {
    const start = parseInt(match[1], 10)
    const endText = String(match[2]).toLowerCase()
    const end = /present|current|today|aujourd|actuel/.test(endText) ? currentYear : parseInt(endText, 10)
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start < 40) spans.push([start, end])
  }
  spans.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (!last || span[0] > last[1]) merged.push([...span])
    else last[1] = Math.max(last[1], span[1])
  }
  for (const [start, end] of merged) total += Math.max(0, end - start)
  return Math.min(total, 35)
}

function detectRoleLevel(text = '') {
  const lower = clean(text)
  for (const item of ROLE_LEVELS) {
    if (item.terms.some(term => lower.includes(clean(term)))) return item.level
  }
  return 'unspecified'
}

function sectionMap(cvText = '') {
  const headings = [
    ['summary', /^(summary|profile|profil|professional summary|about)$/i],
    ['experience', /^(experience|professional experience|work experience|expériences?|experiences professionnelles|employment)$/i],
    ['education', /^(education|formation|academic background)$/i],
    ['skills', /^(skills|competences|compétences|technical skills|technologies)$/i],
    ['certifications', /^(certifications?|certificats?)$/i],
    ['languages', /^(languages|langues)$/i]
  ]
  const sections = {}
  let current = 'other'
  for (const raw of String(cvText || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const heading = headings.find(([, pattern]) => pattern.test(line.replace(/[:\-]/g, '').trim()))
    if (heading) {
      current = heading[0]
      sections[current] ||= []
      continue
    }
    sections[current] ||= []
    sections[current].push(line)
  }
  return Object.fromEntries(Object.entries(sections).map(([key, lines]) => [key, lines.join('\n')]))
}

function parseCvSchema(cvText = '') {
  const sections = sectionMap(cvText)
  const text = String(cvText || '')
  const warnings = []
  const hasExperience = Boolean(sections.experience && sections.experience.length > 200)
  const hasSkills = Boolean(sections.skills && sections.skills.length > 40)
  const hasEducation = Boolean(sections.education && sections.education.length > 40)
  const lineCount = text.split(/\r?\n/).filter(Boolean).length
  const textLength = text.trim().length
  const tableLike = /\t| {4,}|\|/.test(text)
  const bulletCount = (text.match(/[•●▪\-*]\s+/g) || []).length
  const explicitYears = extractYears(text)
  const rangeYears = extractDateRangeYears(sections.experience || text)
  if (textLength < 700) warnings.push('CV extraction looks thin; ATS may miss experience or skills.')
  if (!hasExperience) warnings.push('No clear Experience section detected; ATS parsers rely heavily on standard headers.')
  if (!hasSkills) warnings.push('No clear Skills section detected; keyword matching may be weaker.')
  if (lineCount < 15) warnings.push('CV text has very few line breaks; parser may have flattened the layout.')
  if (tableLike) warnings.push('Table/column-like formatting detected; older ATS parsers may drop fields.')
  const parseQuality = clamp(42 + (textLength > 1200 ? 18 : 0) + (hasExperience ? 18 : 0) + (hasSkills ? 12 : 0) + (hasEducation ? 5 : 0) + (bulletCount >= 5 ? 5 : 0) - (tableLike ? 8 : 0), 50)
  return { parse_quality: parseQuality, parser_risk: parseQuality >= 80 ? 'low' : parseQuality >= 60 ? 'medium' : 'high', warnings: unique(warnings, 6), schema: { contact_info_detected: /@|\+?\d[\d\s().-]{7,}/.test(text), work_history_detected: hasExperience, education_detected: hasEducation, skills_detected: hasSkills, sections_detected: Object.keys(sections).filter(key => key !== 'other'), extracted_skills: extractSkills([sections.skills, sections.experience, text].filter(Boolean).join('\n'), { strict: true }).slice(0, 40), candidate_level: detectRoleLevel(text), candidate_years_signal: Math.max(explicitYears, rangeYears), text_length: textLength } }
}

function buildBooleanGroups(jobText = '', skills = []) {
  const lower = clean(jobText)
  const groups = []
  const tech = skills.filter(skill => TECH_TERMS.map(clean).includes(clean(skill))).slice(0, 8)
  if (tech.length) groups.push({ label: 'Core technical terms', operator: 'OR', terms: tech })
  const seniorityTerms = ['manager','responsable','lead','senior','expert','director','head of'].filter(term => lower.includes(term))
  if (seniorityTerms.length) groups.push({ label: 'Seniority / title trigger', operator: 'OR', terms: seniorityTerms.map(titleCase) })
  const serviceTerms = ['itil','sla','slo','kpi','support','incident','service desk','run','mco'].filter(term => lower.includes(term))
  if (serviceTerms.length) groups.push({ label: 'Operations / service delivery trigger', operator: 'OR', terms: serviceTerms.map(titleCase) })
  const locationTerms = ['france','paris','remote','hybrid','onsite','anglais','english','french','français'].filter(term => lower.includes(term))
  if (locationTerms.length) groups.push({ label: 'Location / language trigger', operator: 'OR', terms: locationTerms.map(titleCase) })
  return groups.slice(0, 5)
}

function parseJobSchema(jobText = '') {
  const text = String(jobText || '')
  const lines = text.split(/\r?\n|\./).map(line => line.trim()).filter(line => line.length > 3)
  const title = lines.find(line => line.length <= 90 && /manager|responsable|lead|engineer|technician|support|director|consultant|administrator|developer|chef|expert/i.test(line)) || lines[0] || 'Not specified'
  const requiredSignals = lines.filter(line => /required|must|minimum|mandatory|essential|you have|you bring|required skills|profile|requirements|requis|obligatoire|minimum|expérience|competences|compétences|profil/i.test(line))
  const niceSignals = lines.filter(line => /nice|plus|preferred|bonus|ideally|souhait|apprécié|apprecie/i.test(line))
  const allStrictSkills = extractSkills(text, { strict: true })
  const requiredStrict = extractSkills(requiredSignals.join('\n'), { strict: true })
  const niceStrict = extractSkills(niceSignals.join('\n'), { strict: true })
  const mustHave = unique([...(requiredStrict.length ? requiredStrict : allStrictSkills.slice(0, 14))], 16).filter(oneToThreeWords)
  const niceToHave = unique([...niceStrict, ...allStrictSkills.filter(skill => !mustHave.map(clean).includes(clean(skill))).slice(0, 8)], 10).filter(oneToThreeWords)
  return { title, required_skills: mustHave, nice_to_have_skills: niceToHave, minimum_years_experience: extractYears(text), years_experience_required: extractYears(text), role_level: detectRoleLevel(text), must_have_phrases: unique(requiredSignals.slice(0, 10), 10), nice_to_have_phrases: unique(niceSignals.slice(0, 8), 8), boolean_groups: buildBooleanGroups(text, mustHave), text_quality: text.length > 1600 ? 'strong' : text.length > 700 ? 'usable' : 'thin' }
}

function exactOrSynonymMatch(requiredSkill = '', candidateSkills = []) {
  const requiredAliases = aliasesForSkill(requiredSkill).map(clean)
  const candidateAliases = candidateSkills.flatMap(skill => aliasesForSkill(skill).map(clean))
  const candidateCanonical = candidateSkills.map(canonicalSkill)
  const hitIndex = candidateAliases.findIndex(alias => requiredAliases.includes(alias))
  if (hitIndex >= 0) return candidateCanonical[Math.min(hitIndex, candidateCanonical.length - 1)] || canonicalSkill(requiredSkill)
  return ''
}

function strictMatch(requiredSkills = [], candidateSkills = []) {
  const matched = []
  const missing = []
  for (const required of requiredSkills) {
    const matchedSkill = exactOrSynonymMatch(required, candidateSkills)
    if (matchedSkill) matched.push({ required_skill: canonicalSkill(required), matched_candidate_skill: matchedSkill })
    else missing.push(canonicalSkill(required))
  }
  return { matched, missing }
}

function evaluateBooleanGroups(groups = [], cvText = '') {
  return groups.map(group => {
    const terms = group.terms || []
    const matched_terms = terms.filter(term => hasTerm(cvText, term) || exactOrSynonymMatch(term, extractSkills(cvText, { strict: true })))
    const passed = group.operator === 'AND' ? matched_terms.length === terms.length : matched_terms.length > 0
    return { ...group, matched_terms, missing_terms: terms.filter(term => !matched_terms.includes(term)), passed }
  })
}

function semanticMatches(jobSkills = [], candidateSkills = []) {
  const matched = []
  const missing = []
  for (const skill of jobSkills) {
    const hit = exactOrSynonymMatch(skill, candidateSkills)
    if (hit) matched.push({ requirement: canonicalSkill(skill), matched_by: hit, type: clean(canonicalSkill(skill)) === clean(hit) ? 'exact' : 'accepted_synonym' })
    else missing.push(canonicalSkill(skill))
  }
  return { matches: matched, missing }
}

function proofSignals(cvText = '') {
  const text = String(cvText || '')
  const metrics = (text.match(/\b\d+\s*(%|k|m|users|utilisateurs|devices|appareils|tickets|sla|sites|countries|pays|people|personnes|servers|serveurs|€|£|\$)/gi) || []).slice(0, 12)
  const leadership = ['managed','led','supervised','coordinated','owned','piloted','responsable','dirigé','géré','encadré','supervisé'].filter(term => hasTerm(text, term))
  const action = ['implemented','deployed','migrated','automated','improved','reduced','created','built','rolled out','déployé','mis en place','automatisé','amélioré','réduit'].filter(term => hasTerm(text, term))
  return { metrics, leadership, action }
}

function buildCoachingFeedback(missing = [], experienceGap = 0) {
  const parts = []
  if (missing.length) parts.push(`You have a workable base, but the ATS may miss you because these required keywords are absent: ${missing.slice(0, 6).join(', ')}. Add them only if they reflect real experience.`)
  else parts.push('Strong foundation: the required hard-skill keywords are visible in the resume.')
  if (experienceGap > 0) parts.push(`There is a ${experienceGap}-year experience gap on paper, so compensate with dense project proof, measurable outcomes, ownership, and problem-solving impact.`)
  else parts.push('Experience tenure appears sufficient; focus on making impact and scope easy to scan.')
  return parts.join(' ').slice(0, 850)
}

function buildStrictAtsResult(job, cv, strict) {
  const requiredYears = Number(job.minimum_years_experience || job.years_experience_required || 0)
  const candidateYears = Number(cv.schema.candidate_years_signal || 0)
  const gap = Math.max(0, requiredYears - candidateYears)
  return {
    job_requirements: { required_skills: job.required_skills.map(canonicalSkill), minimum_years_experience: requiredYears },
    candidate_profile: { candidate_skills: cv.schema.extracted_skills.map(canonicalSkill), total_years_experience: candidateYears },
    analysis: { matched_skills: strict.matched, missing_skills: strict.missing, experience_gap_years: gap },
    coaching_feedback: buildCoachingFeedback(strict.missing, gap)
  }
}

function scoreAts(jobText = '', cvText = '') {
  const cv = parseCvSchema(cvText)
  const job = parseJobSchema(jobText)
  const candidateSkills = cv.schema.extracted_skills
  const strict = strictMatch(job.required_skills, candidateSkills)
  const strictResult = buildStrictAtsResult(job, cv, strict)
  const jobSkills = unique([...job.required_skills, ...job.nice_to_have_skills], 22)
  const exactFound = strict.matched.map(item => item.required_skill)
  const exactMissing = strict.missing
  const keywordDensity = job.required_skills.map(skill => ({ term: canonicalSkill(skill), cv_count: Math.max(...aliasesForSkill(skill).map(alias => countOccurrences(cvText, alias))), jd_count: Math.max(...aliasesForSkill(skill).map(alias => countOccurrences(jobText, alias))) }))
  const booleanResults = evaluateBooleanGroups(job.boolean_groups, cvText)
  const semantic = semanticMatches(jobSkills, candidateSkills)
  const proof = proofSignals(cvText)
  const keywordScore = clamp((exactFound.length / Math.max(job.required_skills.length, 1)) * 100, 0)
  const booleanScore = clamp((booleanResults.filter(item => item.passed).length / Math.max(booleanResults.length, 1)) * 100, booleanResults.length ? 0 : 60)
  const semanticScore = clamp((semantic.matches.length / Math.max(jobSkills.length, 1)) * 100, 0)
  const proofScore = clamp(35 + Math.min(proof.metrics.length, 6) * 7 + Math.min(proof.leadership.length, 4) * 6 + Math.min(proof.action.length, 5) * 4, 40)
  const yearsRequired = job.years_experience_required
  const yearsCandidate = cv.schema.candidate_years_signal
  const yearsScore = yearsRequired ? clamp((yearsCandidate / yearsRequired) * 100, yearsCandidate ? 50 : 35) : 70
  const seniorityScore = job.role_level === 'unspecified' || cv.schema.candidate_level === 'unspecified' ? 65 : job.role_level === cv.schema.candidate_level ? 90 : (job.role_level === 'manager' && ['executive','senior'].includes(cv.schema.candidate_level)) ? 78 : 58
  const requirementsScore = clamp(keywordScore * 0.72 + yearsScore * 0.18 + seniorityScore * 0.10, 50)
  const finalScore = clamp(cv.parse_quality * 0.08 + keywordScore * 0.32 + requirementsScore * 0.24 + booleanScore * 0.14 + semanticScore * 0.12 + proofScore * 0.10, 50)
  const bucket = finalScore >= 78 ? 'Highly Qualified' : finalScore >= 62 ? 'Review / Maybe' : finalScore >= 48 ? 'Low Priority' : 'Likely Filtered'
  const visibility = finalScore >= 78 ? 'top_of_shortlist' : finalScore >= 62 ? 'visible_if_recruiter_reviews_more_profiles' : finalScore >= 48 ? 'bottom_of_pagination' : 'unlikely_to_be_seen'
  const hardFailures = booleanResults.filter(item => !item.passed).flatMap(item => item.missing_terms).slice(0, 8)
  return { strict_ats_result: strictResult, ats_score: finalScore, extraction_phase: { cv_parse_quality: cv.parse_quality, parser_risk: cv.parser_risk, parser_warnings: cv.warnings, cv_schema: cv.schema, job_schema: job, linkedin_profile_note: 'LinkedIn profiles are usually structured before matching; uploaded CVs depend heavily on document parsing quality.' }, matching_algorithm: { score_breakdown: { cv_parser_quality: cv.parse_quality, exact_keyword_match: keywordScore, requirements_match: requirementsScore, boolean_search_match: booleanScore, semantic_match: semanticScore, proof_strength: proofScore }, keyword_density: keywordDensity, exact_keywords: { found: exactFound, missing_required: exactMissing }, boolean_search: { query_style: booleanResults.map(g => `(${g.terms.join(` ${g.operator} `)})`).join(' AND '), groups: booleanResults, hard_filter_failures: hardFailures }, semantic_matching: { matched: semantic.matches.slice(0, 12), missing: semantic.missing.slice(0, 10) }, experience_proof: { metrics: proof.metrics, leadership_terms: proof.leadership, action_terms: proof.action, years_required: yearsRequired, years_candidate_signal: yearsCandidate } }, recruiter_view: { rank_bucket: bucket, visibility, shortlist_probability: finalScore, reason: finalScore >= 78 ? 'Strong ATS visibility: enough exact/synonym matches and readable CV structure.' : finalScore >= 62 ? 'Likely visible, but recruiter may need stronger proof for missing requirements.' : 'Risk of being pushed down because the parsed CV does not clearly satisfy enough strict ATS triggers.' } }
}

export function enhanceAnalysisWithAts(analysis = {}, jobText = '', cvText = '') {
  const ats = scoreAts(jobText, cvText)
  const aiScore = clamp(analysis.display_score ?? analysis.match_probability, ats.ats_score)
  const finalScore = clamp(ats.ats_score * 0.78 + aiScore * 0.22, ats.ats_score)
  const exact = ats.matching_algorithm.exact_keywords
  const semantic = ats.matching_algorithm.semantic_matching
  const breakdown = ats.matching_algorithm.score_breakdown
  const recruiterVerdict = finalScore >= 78 ? 'strong_shortlist' : finalScore >= 58 ? 'possible_shortlist' : 'unlikely_shortlist'
  const overallVerdict = finalScore >= 75 ? 'likely_passed' : finalScore >= 55 ? 'borderline' : 'likely_filtered'
  return { ...analysis, strict_ats_result: ats.strict_ats_result, display_score: finalScore, match_probability: finalScore, ats_pipeline: ats, keyword_match: { ...(analysis.keyword_match || {}), score: breakdown.exact_keyword_match, found: unique([...(exact.found || []), ...((analysis.keyword_match || {}).found || [])], 12), missing_required: unique([...(exact.missing_required || []), ...semantic.missing], 12), missing_nice: unique((analysis.keyword_match || {}).missing_nice || [], 8), keyword_stuffing_risk: (analysis.keyword_match || {}).keyword_stuffing_risk || 'low' }, requirements_check: { ...(analysis.requirements_check || {}), score: breakdown.requirements_match, must_have: ats.extraction_phase.job_schema.required_skills.slice(0, 14), nice_to_have: ats.extraction_phase.job_schema.nice_to_have_skills.slice(0, 10), met: unique([...(exact.found || []), ...semantic.matched.map(item => `${item.requirement} → ${item.matched_by}`)], 10), unmet: unique([...(exact.missing_required || []), ...ats.matching_algorithm.boolean_search.hard_filter_failures], 10) }, semantic_fit: { ...(analysis.semantic_fit || {}), score: breakdown.semantic_match, matched_responsibilities: semantic.matched.map(item => `${item.requirement} → ${item.matched_by}`).slice(0, 8), weak_or_missing_responsibilities: semantic.missing.slice(0, 8), domain_fit: breakdown.semantic_match >= 75 ? 'strong' : breakdown.semantic_match >= 50 ? 'moderate' : 'weak', domain_reason: 'Calculated from exact matches and accepted industry synonyms. Broad assumptions are not counted as matches.' }, recruiter_shortlist: { ...(analysis.recruiter_shortlist || {}), probability: finalScore, verdict: recruiterVerdict, reason: ats.recruiter_view.reason, top_screening_factors: unique([...(exact.found || []), ...ats.matching_algorithm.experience_proof.metrics.slice(0, 4)], 8), likely_recruiter_concerns: unique([...(exact.missing_required || []), ...ats.extraction_phase.parser_warnings], 8) }, experience_depth: { ...(analysis.experience_depth || {}), score: breakdown.proof_strength, metrics: ats.matching_algorithm.experience_proof.metrics.length ? 'visible' : 'weak_or_missing', leadership: ats.matching_algorithm.experience_proof.leadership_terms.length ? 'visible' : 'weak_or_missing', proof_summary: 'Measured from parsed evidence: metrics, leadership verbs, action verbs, seniority and years signals.' }, proof_gaps: unique([...(analysis.proof_gaps || []), ...exact.missing_required.slice(0, 6), ...ats.extraction_phase.parser_warnings], 10), critical_gaps: unique([...(analysis.critical_gaps || []), ...ats.matching_algorithm.boolean_search.hard_filter_failures, ...exact.missing_required], 6), format_warnings: unique([...(analysis.format_warnings || []), ...ats.extraction_phase.parser_warnings], 8), quick_wins: unique(['Use standard ATS headers: Experience, Skills, Education and Certifications.', ...exact.missing_required.slice(0, 4).map(term => `Add the exact keyword “${term}” only if you truly have that experience.`), ...(analysis.quick_wins || [])], 8), rewrite_priorities: unique([...(exact.missing_required || []), ...semantic.missing, ...(analysis.rewrite_priorities || [])], 10), overall_verdict: overallVerdict, overall_reason: `${ats.recruiter_view.reason} Score includes parser quality, exact keywords, accepted synonyms, Boolean search, experience gap and proof strength.`, analysis_version: 'ats-intelligence-v5-strict-dual-engine' }
}
