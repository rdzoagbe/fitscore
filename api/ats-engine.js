const STOPWORDS = new Set([
  'with','from','that','this','your','you','our','the','and','for','are','will','have','has','had','into','about','over','under','within','their','them','they','role','job','work','team','teams','business','candidate','profile','experience','skills','required','requirements','mission','missions','poste','profil','avec','dans','pour','vous','nous','les','des','une','aux','sur','qui','que','est','sont','être','avoir','plus','afin','ainsi','candidat','expérience','compétences'
])

const TECH_TERMS = [
  'active directory','azure ad','entra id','microsoft 365','office 365','intune','autopilot','defender','jamf','sccm','endpoint manager','sharepoint','teams','exchange','powershell','graph api','azure','aws','gcp','cloud','terraform','ansible','kubernetes','docker','ci/cd','devops','sre','itil','sla','slo','kpi','servicenow','jira','zendesk','freshdesk','sql','power bi','power platform','crm','erp','yardi','api','integration','security','cybersecurity','network','firewall','vpn','identity','iam','sso','mfa','windows','linux','macos','helpdesk','service desk','support','incident','change management','problem management','asset management','budget','vendor','supplier','run','mco','production','infrastructure','architecture','migration','project management','stakeholder','leadership','manager','management','team management','recruitment','onboarding','monitoring','availability','disaster recovery','backup','compliance','gdpr','iso 27001','ticketing','ticketing system','data center','datacenter','hardware','networking','o365','mdm','edr','xdr','bcp','drp','business continuity'
]

const SEMANTIC_GROUPS = [
  ['helpdesk','service desk','it support','support desk','technical support'],
  ['manager','lead','responsable','head of','team leader','people management','leadership'],
  ['microsoft 365','office 365','o365','m365'],
  ['azure ad','entra id','identity','iam','directory services','active directory'],
  ['intune','endpoint manager','mdm','device management','autopilot'],
  ['sre','site reliability','production operations','run','mco','operational excellence'],
  ['itil','incident management','change management','problem management','service management'],
  ['sla','slo','kpi','service level','performance indicator'],
  ['automation','powershell','scripting','graph api','workflow automation'],
  ['cloud','azure','aws','gcp','iaas','paas'],
  ['security','cybersecurity','defender','edr','xdr','compliance'],
  ['vendor','supplier','outsourcing','managed service','infogérance'],
  ['project management','program management','delivery','roadmap','stakeholder management'],
  ['ticketing','servicenow','jira','zendesk','freshdesk','itsm']
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

function unique(items = [], limit = 50) {
  return [...new Set(items.filter(Boolean).map(item => String(item).trim()).filter(Boolean))].slice(0, limit)
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

function extractSkills(text = '') {
  const lower = clean(text)
  const foundTech = TECH_TERMS.filter(term => lower.includes(clean(term)))
  const frequent = topTerms(text, 24).filter(term => term.length >= 4)
  return unique([...foundTech, ...frequent], 28)
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
  if (textLength < 700) warnings.push('CV extraction looks thin; ATS may miss experience or skills.')
  if (!hasExperience) warnings.push('No clear Experience section detected; ATS parsers rely heavily on standard headers.')
  if (!hasSkills) warnings.push('No clear Skills section detected; keyword matching may be weaker.')
  if (lineCount < 15) warnings.push('CV text has very few line breaks; parser may have flattened the layout.')
  if (tableLike) warnings.push('Table/column-like formatting detected; older ATS parsers may drop fields.')
  const parseQuality = clamp(42 + (textLength > 1200 ? 18 : 0) + (hasExperience ? 18 : 0) + (hasSkills ? 12 : 0) + (hasEducation ? 5 : 0) + (bulletCount >= 5 ? 5 : 0) - (tableLike ? 8 : 0), 50)
  return { parse_quality: parseQuality, parser_risk: parseQuality >= 80 ? 'low' : parseQuality >= 60 ? 'medium' : 'high', warnings: unique(warnings, 6), schema: { contact_info_detected: /@|\+?\d[\d\s().-]{7,}/.test(text), work_history_detected: hasExperience, education_detected: hasEducation, skills_detected: hasSkills, sections_detected: Object.keys(sections).filter(key => key !== 'other'), extracted_skills: extractSkills([sections.skills, sections.experience, text].filter(Boolean).join('\n')).slice(0, 24), candidate_level: detectRoleLevel(text), candidate_years_signal: extractYears(text), text_length: textLength } }
}

function buildBooleanGroups(jobText = '', skills = []) {
  const lower = clean(jobText)
  const groups = []
  const tech = skills.filter(skill => TECH_TERMS.includes(clean(skill))).slice(0, 8)
  if (tech.length) groups.push({ label: 'Core technical terms', operator: 'OR', terms: tech })
  const seniorityTerms = ['manager','responsable','lead','senior','expert','director','head of'].filter(term => lower.includes(term))
  if (seniorityTerms.length) groups.push({ label: 'Seniority / title trigger', operator: 'OR', terms: seniorityTerms })
  const serviceTerms = ['itil','sla','slo','kpi','support','incident','service desk','run','mco'].filter(term => lower.includes(term))
  if (serviceTerms.length) groups.push({ label: 'Operations / service delivery trigger', operator: 'OR', terms: serviceTerms })
  const locationTerms = ['france','paris','remote','hybrid','onsite','anglais','english','french','français'].filter(term => lower.includes(term))
  if (locationTerms.length) groups.push({ label: 'Location / language trigger', operator: 'OR', terms: locationTerms })
  return groups.slice(0, 5)
}

function parseJobSchema(jobText = '') {
  const text = String(jobText || '')
  const lines = text.split(/\r?\n|\./).map(line => line.trim()).filter(line => line.length > 3)
  const title = lines.find(line => line.length <= 90 && /manager|responsable|lead|engineer|technician|support|director|consultant|administrator|developer|chef|expert/i.test(line)) || lines[0] || 'Not specified'
  const requiredSignals = lines.filter(line => /required|must|minimum|mandatory|essential|you have|you bring|required skills|profile|requirements|requis|obligatoire|minimum|expérience|competences|compétences|profil/i.test(line))
  const niceSignals = lines.filter(line => /nice|plus|preferred|bonus|ideally|souhait|apprécié|apprecie/i.test(line))
  const skills = extractSkills(text)
  const mustHave = unique([...skills.slice(0, 12), ...requiredSignals.flatMap(extractSkills)], 16)
  const niceToHave = unique([...niceSignals.flatMap(extractSkills), ...skills.slice(12, 20)], 10)
  return { title, required_skills: mustHave, nice_to_have_skills: niceToHave, years_experience_required: extractYears(text), role_level: detectRoleLevel(text), must_have_phrases: unique(requiredSignals.slice(0, 10), 10), nice_to_have_phrases: unique(niceSignals.slice(0, 8), 8), boolean_groups: buildBooleanGroups(text, mustHave), text_quality: text.length > 1600 ? 'strong' : text.length > 700 ? 'usable' : 'thin' }
}

function evaluateBooleanGroups(groups = [], cvText = '') {
  return groups.map(group => {
    const terms = group.terms || []
    const matched_terms = terms.filter(term => hasTerm(cvText, term))
    const passed = group.operator === 'AND' ? matched_terms.length === terms.length : matched_terms.length > 0
    return { ...group, matched_terms, missing_terms: terms.filter(term => !matched_terms.includes(term)), passed }
  })
}

function semanticMatches(jobSkills = [], cvText = '') {
  const cv = clean(cvText)
  const matches = []
  const missing = []
  for (const skill of jobSkills) {
    const normalized = clean(skill)
    const group = SEMANTIC_GROUPS.find(items => items.some(item => clean(item) === normalized || normalized.includes(clean(item)) || clean(item).includes(normalized)))
    if (!group) {
      if (hasTerm(cvText, skill)) matches.push({ requirement: skill, matched_by: skill, type: 'exact' })
      else missing.push(skill)
      continue
    }
    const hit = group.find(term => cv.includes(clean(term)))
    if (hit) matches.push({ requirement: skill, matched_by: hit, type: clean(hit) === normalized ? 'exact' : 'semantic' })
    else missing.push(skill)
  }
  return { matches, missing }
}

function proofSignals(cvText = '') {
  const text = String(cvText || '')
  const metrics = (text.match(/\b\d+\s*(%|k|m|users|utilisateurs|devices|appareils|tickets|sla|sites|countries|pays|people|personnes|servers|serveurs|€|£|\$)/gi) || []).slice(0, 12)
  const leadership = ['managed','led','supervised','coordinated','owned','piloted','responsable','dirigé','géré','encadré','supervisé'].filter(term => hasTerm(text, term))
  const action = ['implemented','deployed','migrated','automated','improved','reduced','created','built','rolled out','déployé','mis en place','automatisé','amélioré','réduit'].filter(term => hasTerm(text, term))
  return { metrics, leadership, action }
}

function scoreAts(jobText = '', cvText = '') {
  const cv = parseCvSchema(cvText)
  const job = parseJobSchema(jobText)
  const jobSkills = unique([...job.required_skills, ...job.nice_to_have_skills], 22)
  const exactFound = job.required_skills.filter(skill => hasTerm(cvText, skill))
  const exactMissing = job.required_skills.filter(skill => !hasTerm(cvText, skill))
  const keywordDensity = job.required_skills.map(skill => ({ term: skill, cv_count: countOccurrences(cvText, skill), jd_count: countOccurrences(jobText, skill) }))
  const booleanResults = evaluateBooleanGroups(job.boolean_groups, cvText)
  const semantic = semanticMatches(jobSkills, cvText)
  const proof = proofSignals(cvText)
  const keywordScore = clamp((exactFound.length / Math.max(job.required_skills.length, 1)) * 100, 0)
  const booleanScore = clamp((booleanResults.filter(item => item.passed).length / Math.max(booleanResults.length, 1)) * 100, booleanResults.length ? 0 : 60)
  const semanticScore = clamp((semantic.matches.length / Math.max(jobSkills.length, 1)) * 100, 0)
  const proofScore = clamp(35 + Math.min(proof.metrics.length, 6) * 7 + Math.min(proof.leadership.length, 4) * 6 + Math.min(proof.action.length, 5) * 4, 40)
  const yearsRequired = job.years_experience_required
  const yearsCandidate = cv.schema.candidate_years_signal
  const yearsScore = yearsRequired ? clamp((yearsCandidate / yearsRequired) * 100, yearsCandidate ? 50 : 35) : 70
  const seniorityScore = job.role_level === 'unspecified' || cv.schema.candidate_level === 'unspecified' ? 65 : job.role_level === cv.schema.candidate_level ? 90 : (job.role_level === 'manager' && ['executive','senior'].includes(cv.schema.candidate_level)) ? 78 : 58
  const requirementsScore = clamp(keywordScore * 0.6 + yearsScore * 0.2 + seniorityScore * 0.2, 50)
  const finalScore = clamp(cv.parse_quality * 0.10 + keywordScore * 0.24 + requirementsScore * 0.24 + booleanScore * 0.16 + semanticScore * 0.16 + proofScore * 0.10, 50)
  const bucket = finalScore >= 78 ? 'Highly Qualified' : finalScore >= 62 ? 'Review / Maybe' : finalScore >= 48 ? 'Low Priority' : 'Likely Filtered'
  const visibility = finalScore >= 78 ? 'top_of_shortlist' : finalScore >= 62 ? 'visible_if_recruiter_reviews_more_profiles' : finalScore >= 48 ? 'bottom_of_pagination' : 'unlikely_to_be_seen'
  const hardFailures = booleanResults.filter(item => !item.passed).flatMap(item => item.missing_terms).slice(0, 8)
  return { ats_score: finalScore, extraction_phase: { cv_parse_quality: cv.parse_quality, parser_risk: cv.parser_risk, parser_warnings: cv.warnings, cv_schema: cv.schema, job_schema: job, linkedin_profile_note: 'LinkedIn profiles are usually structured before matching; uploaded CVs depend heavily on document parsing quality.' }, matching_algorithm: { score_breakdown: { cv_parser_quality: cv.parse_quality, exact_keyword_match: keywordScore, requirements_match: requirementsScore, boolean_search_match: booleanScore, semantic_match: semanticScore, proof_strength: proofScore }, keyword_density: keywordDensity, exact_keywords: { found: exactFound, missing_required: exactMissing }, boolean_search: { query_style: booleanResults.map(g => `(${g.terms.join(` ${g.operator} `)})`).join(' AND '), groups: booleanResults, hard_filter_failures: hardFailures }, semantic_matching: { matched: semantic.matches.slice(0, 12), missing: semantic.missing.slice(0, 10) }, experience_proof: { metrics: proof.metrics, leadership_terms: proof.leadership, action_terms: proof.action, years_required: yearsRequired, years_candidate_signal: yearsCandidate } }, recruiter_view: { rank_bucket: bucket, visibility, shortlist_probability: finalScore, reason: finalScore >= 78 ? 'Strong ATS visibility: enough exact/semantic matches and readable CV structure.' : finalScore >= 62 ? 'Likely visible, but recruiter may need stronger proof for missing requirements.' : 'Risk of being pushed down because the parsed CV does not clearly satisfy enough ATS triggers.' } }
}

export function enhanceAnalysisWithAts(analysis = {}, jobText = '', cvText = '') {
  const ats = scoreAts(jobText, cvText)
  const aiScore = clamp(analysis.display_score ?? analysis.match_probability, ats.ats_score)
  const finalScore = clamp(ats.ats_score * 0.72 + aiScore * 0.28, ats.ats_score)
  const exact = ats.matching_algorithm.exact_keywords
  const semantic = ats.matching_algorithm.semantic_matching
  const breakdown = ats.matching_algorithm.score_breakdown
  const recruiterVerdict = finalScore >= 78 ? 'strong_shortlist' : finalScore >= 58 ? 'possible_shortlist' : 'unlikely_shortlist'
  const overallVerdict = finalScore >= 75 ? 'likely_passed' : finalScore >= 55 ? 'borderline' : 'likely_filtered'
  return { ...analysis, display_score: finalScore, match_probability: finalScore, ats_pipeline: ats, keyword_match: { ...(analysis.keyword_match || {}), score: breakdown.exact_keyword_match, found: unique([...(exact.found || []), ...((analysis.keyword_match || {}).found || [])], 12), missing_required: unique([...(exact.missing_required || []), ...semantic.missing], 12), missing_nice: unique((analysis.keyword_match || {}).missing_nice || [], 8), keyword_stuffing_risk: (analysis.keyword_match || {}).keyword_stuffing_risk || 'low' }, requirements_check: { ...(analysis.requirements_check || {}), score: breakdown.requirements_match, must_have: ats.extraction_phase.job_schema.required_skills.slice(0, 14), nice_to_have: ats.extraction_phase.job_schema.nice_to_have_skills.slice(0, 10), met: unique([...(exact.found || []), ...semantic.matched.map(item => `${item.requirement} → ${item.matched_by}`)], 10), unmet: unique([...(exact.missing_required || []), ...ats.matching_algorithm.boolean_search.hard_filter_failures], 10) }, semantic_fit: { ...(analysis.semantic_fit || {}), score: breakdown.semantic_match, matched_responsibilities: semantic.matched.map(item => `${item.requirement} → ${item.matched_by}`).slice(0, 8), weak_or_missing_responsibilities: semantic.missing.slice(0, 8), domain_fit: breakdown.semantic_match >= 75 ? 'strong' : breakdown.semantic_match >= 50 ? 'moderate' : 'weak', domain_reason: 'Calculated from exact and equivalent skill families, not only AI interpretation.' }, recruiter_shortlist: { ...(analysis.recruiter_shortlist || {}), probability: finalScore, verdict: recruiterVerdict, reason: ats.recruiter_view.reason, top_screening_factors: unique([...(exact.found || []), ...ats.matching_algorithm.experience_proof.metrics.slice(0, 4)], 8), likely_recruiter_concerns: unique([...(exact.missing_required || []), ...ats.extraction_phase.parser_warnings], 8) }, experience_depth: { ...(analysis.experience_depth || {}), score: breakdown.proof_strength, metrics: ats.matching_algorithm.experience_proof.metrics.length ? 'visible' : 'weak_or_missing', leadership: ats.matching_algorithm.experience_proof.leadership_terms.length ? 'visible' : 'weak_or_missing', proof_summary: 'Measured from parsed evidence: metrics, leadership verbs, action verbs, seniority and years signals.' }, proof_gaps: unique([...(analysis.proof_gaps || []), ...exact.missing_required.slice(0, 6), ...ats.extraction_phase.parser_warnings], 10), critical_gaps: unique([...(analysis.critical_gaps || []), ...ats.matching_algorithm.boolean_search.hard_filter_failures, ...exact.missing_required], 6), format_warnings: unique([...(analysis.format_warnings || []), ...ats.extraction_phase.parser_warnings], 8), quick_wins: unique(['Use standard ATS headers: Experience, Skills, Education and Certifications.', ...exact.missing_required.slice(0, 4).map(term => `Add evidence for “${term}” if it is true.`), ...(analysis.quick_wins || [])], 8), rewrite_priorities: unique([...(exact.missing_required || []), ...semantic.missing, ...(analysis.rewrite_priorities || [])], 10), overall_verdict: overallVerdict, overall_reason: `${ats.recruiter_view.reason} Score includes parser quality, exact keywords, Boolean search, semantic matching and proof strength.`, analysis_version: 'ats-intelligence-v4-deterministic' }
}
