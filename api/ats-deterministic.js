const COMMON_STOPWORDS = new Set([
  'avec','pour','dans','vous','nous','les','des','une','aux','sur','qui','que','par','plus','vos','nos','notre','votre','leur','leurs','afin','ainsi','poste','mission','profil','équipe','equipe','candidat','candidate','emploi','travail','entreprise','client','clients','projet','projets','expérience','experience',
  'the','and','for','with','your','our','this','that','from','role','team','work','working','job','candidate','company','business','project','projects','experience','skills','required','requirements','responsibilities','profile','about','will','have','has','are','you','we','they','their','them','into','within'
])

const SKILL_SYNONYMS = [
  ['microsoft 365', ['office 365', 'm365', 'o365']],
  ['entra id', ['azure ad', 'aad', 'azure active directory']],
  ['intune', ['endpoint manager', 'microsoft endpoint manager', 'mem']],
  ['service desk', ['helpdesk', 'help desk', 'it support']],
  ['ci/cd', ['continuous integration', 'continuous delivery', 'continuous deployment']],
  ['node.js', ['nodejs', 'node js']],
  ['power bi', ['powerbi']],
  ['active directory', ['ad ds', 'windows ad']],
  ['itil', ['it service management', 'itsm']],
  ['jira', ['atlassian jira']],
  ['azure', ['microsoft azure']],
  ['aws', ['amazon web services']]
]

const TECH_PATTERNS = [
  'active directory','ad ds','amazon web services','api','autopilot','aws','azure','azure ad','backup','business continuity','ci/cd','cloud','compliance','cybersecurity','defender','devops','dns','docker','endpoint manager','entra id','firewall','freshdesk','gpo','helpdesk','iam','incident management','intune','itil','itsm','jamf','jira','kubernetes','linux','m365','mdm','mfa','microsoft 365','monitoring','network','office 365','okta','patch management','power bi','powershell','saml','security','service desk','servicenow','sharepoint','sla','slo','sql','sso','terraform','vpn','windows','windows 11','zendesk',
  'react','next.js','typescript','javascript','node.js','python','postgres','supabase','stripe','vercel','tailwind','firebase','graphql','rest api','html','css'
]

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(items) {
  return [...new Set(items.filter(Boolean).map(item => String(item).trim()).filter(Boolean))]
}

function canonicalSkill(term = '') {
  const normalized = normalizeText(term)
  for (const [canonical, synonyms] of SKILL_SYNONYMS) {
    if (normalized === canonical || synonyms.some(syn => normalized === normalizeText(syn))) return canonical
  }
  return normalized
}

function containsTerm(text, term) {
  const normalizedText = ` ${normalizeText(text)} `
  const normalizedTerm = normalizeText(term)
  if (!normalizedTerm) return false
  const terms = [normalizedTerm]
  for (const [canonical, synonyms] of SKILL_SYNONYMS) {
    if (normalizedTerm === canonical || synonyms.some(syn => normalizedTerm === normalizeText(syn))) {
      terms.push(canonical, ...synonyms.map(normalizeText))
    }
  }
  return unique(terms).some(candidate => normalizedText.includes(` ${candidate} `) || normalizedText.includes(candidate))
}

export function validateJobTextQuality(jobText = '', { source = 'paste', url = '' } = {}) {
  const raw = String(jobText || '').trim()
  const normalized = normalizeText(raw)
  const reasons = []
  const lowerUrl = String(url || '').toLowerCase()

  if (raw.length < 450) reasons.push('The extracted job text is too short to score accurately.')
  if (normalized.length < 300) reasons.push('The extracted job text has too little readable content.')

  const blockedPatterns = [
    'enable javascript','please enable javascript','sign in to continue','login to continue','cookies must be enabled','access denied','are you a human','captcha','bot detection','cloudflare','temporarily unavailable','just a moment','error 403','forbidden'
  ]
  if (blockedPatterns.some(pattern => normalized.includes(pattern))) reasons.push('The URL appears to return a login, JavaScript, cookie, or anti-bot page instead of the job description.')

  const sectionHits = [
    'responsibilities','missions','mission','requirements','qualifications','profile','profil','skills','competences','compétences','experience','expérience','about the role','what you will do','your role','le poste','vos missions'
  ].filter(term => normalized.includes(normalizeText(term))).length

  const actionWordHits = [
    'manage','lead','support','deploy','configure','maintain','monitor','implement','coordinate','develop','design','deliver','analyze','secure','migrate','pilot','gérer','piloter','déployer','configurer','maintenir','coordonner','analyser','sécuriser'
  ].filter(term => normalized.includes(normalizeText(term))).length

  if (sectionHits < 2 && actionWordHits < 4) reasons.push('The extracted text does not contain enough visible responsibilities or requirements.')

  const navNoiseWords = ['privacy','terms','cookie','newsletter','subscribe','follow us','home','menu','search','share','footer','copyright']
  const navNoiseHits = navNoiseWords.filter(term => normalized.includes(term)).length
  if (raw.length < 1200 && navNoiseHits >= 4) reasons.push('The extracted text looks more like page navigation than a real job posting.')

  const restricted = ['linkedin.', 'indeed.', 'glassdoor.', 'workday', 'welcometothejungle.com'].some(domain => lowerUrl.includes(domain))
  const ok = reasons.length === 0
  const quality = ok && raw.length >= 1800 && sectionHits >= 3 ? 'strong' : ok ? 'partial' : 'thin'

  return {
    ok,
    quality,
    reasons,
    source,
    restricted,
    minRecommendedChars: 450,
    message: ok ? null : restricted || source === 'url'
      ? 'We could not reliably extract the full job description from this URL. Paste the full job description for an accurate ATS score.'
      : 'The pasted job description is too short or incomplete. Paste the full responsibilities and requirements for an accurate ATS score.'
  }
}

export function extractSkillTerms(text = '', limit = 18) {
  const normalized = normalizeText(text)
  const foundPatterns = TECH_PATTERNS.filter(term => containsTerm(normalized, term))
  const phraseMatches = [...normalized.matchAll(/\b(?:[a-z0-9+#.-]+\s+){0,2}[a-z0-9+#.-]+\b/g)]
    .map(match => match[0].trim())
    .filter(term => term.length >= 3 && term.length <= 35)
    .filter(term => !COMMON_STOPWORDS.has(term))
    .filter(term => !term.split(' ').every(part => COMMON_STOPWORDS.has(part)))

  const scored = new Map()
  for (const term of [...foundPatterns, ...phraseMatches]) {
    const canonical = canonicalSkill(term)
    if (!canonical || COMMON_STOPWORDS.has(canonical)) continue
    const isKnownTech = TECH_PATTERNS.some(pattern => canonicalSkill(pattern) === canonical)
    const score = (scored.get(canonical) || 0) + (isKnownTech ? 5 : canonical.includes(' ') ? 2 : 1)
    scored.set(canonical, score)
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([term]) => term)
    .slice(0, limit)
}

export function estimateYears(text = '') {
  const normalized = normalizeText(text)
  const explicit = [...normalized.matchAll(/(\d{1,2})\s*\+?\s*(?:years|ans|annees|années)/g)]
    .map(match => Number.parseInt(match[1], 10))
    .filter(Number.isFinite)
  if (explicit.length) return Math.max(...explicit)

  const years = [...normalized.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map(match => Number.parseInt(match[1], 10))
  if (years.length >= 2) {
    const min = Math.min(...years)
    const max = Math.max(...years, new Date().getFullYear())
    return Math.max(0, Math.min(30, max - min))
  }
  return 0
}

function scoreExperience(candidateYears, requiredYears) {
  if (!requiredYears) return 80
  if (candidateYears >= requiredYears) return 100
  if (candidateYears >= requiredYears - 1) return 75
  if (candidateYears >= Math.max(1, requiredYears * 0.6)) return 55
  return 25
}

function scoreSeniority(candidateYears, requiredYears) {
  if (!requiredYears || !candidateYears) return 65
  const diff = candidateYears - requiredYears
  if (diff >= 0 && diff <= 5) return 90
  if (diff > 5) return 75
  if (diff >= -1) return 70
  if (diff >= -3) return 45
  return 25
}

export function buildDeterministicAts(jobText = '', cvText = '') {
  const requiredSkills = extractSkillTerms(jobText, 22)
  const candidateSkills = extractSkillTerms(cvText, 40)
  const matched = []
  const missing = []

  for (const required of requiredSkills) {
    const candidateMatch = candidateSkills.find(skill => canonicalSkill(skill) === canonicalSkill(required) || containsTerm(cvText, required) || containsTerm(required, skill))
    if (candidateMatch || containsTerm(cvText, required)) matched.push({ required_skill: required, matched_candidate_skill: candidateMatch || required })
    else missing.push(required)
  }

  const keywordScore = requiredSkills.length ? Math.round((matched.length / requiredSkills.length) * 100) : 50
  const candidateYears = estimateYears(cvText)
  const requiredYears = estimateYears(jobText)
  const experienceScore = scoreExperience(candidateYears, requiredYears)
  const seniorityScore = scoreSeniority(candidateYears, requiredYears)
  const semanticScore = Math.round((keywordScore * 0.65) + (experienceScore * 0.35))
  const criticalGapPenalty = Math.min(20, missing.slice(0, 4).length * 5)
  const displayScore = Math.max(0, Math.min(100, Math.round(
    keywordScore * 0.35 +
    experienceScore * 0.30 +
    semanticScore * 0.20 +
    seniorityScore * 0.10 +
    70 * 0.05 -
    criticalGapPenalty
  )))

  const verdict = displayScore >= 75 ? 'likely_passed' : displayScore >= 55 ? 'borderline' : 'likely_filtered'

  return {
    deterministic: true,
    requiredSkills,
    candidateSkills,
    matchedSkills: matched,
    missingSkills: missing,
    keywordScore,
    experienceScore,
    seniorityScore,
    semanticScore,
    displayScore,
    verdict,
    candidateYears,
    requiredYears,
    confidence: requiredSkills.length >= 6 ? 'medium' : 'low'
  }
}

export function applyDeterministicAts(analysis, jobText = '', cvText = '') {
  const ats = buildDeterministicAts(jobText, cvText)
  const merged = { ...(analysis || {}) }
  const matchedLabels = ats.matchedSkills.map(item => item.required_skill)
  const missingLabels = ats.missingSkills

  merged.strict_ats_result = {
    ...(merged.strict_ats_result || {}),
    job_requirements: {
      ...(merged.strict_ats_result?.job_requirements || {}),
      required_skills: ats.requiredSkills,
      minimum_years_experience: ats.requiredYears
    },
    candidate_profile: {
      ...(merged.strict_ats_result?.candidate_profile || {}),
      candidate_skills: ats.candidateSkills,
      total_years_experience: ats.candidateYears
    },
    analysis: {
      ...(merged.strict_ats_result?.analysis || {}),
      matched_skills: ats.matchedSkills,
      missing_skills: missingLabels,
      experience_gap_years: Math.max(0, ats.requiredYears - ats.candidateYears)
    }
  }

  merged.display_score = ats.displayScore
  merged.match_probability = ats.displayScore
  merged.overall_verdict = ats.verdict
  merged.keyword_match = {
    ...(merged.keyword_match || {}),
    score: ats.keywordScore,
    found: matchedLabels.slice(0, 10),
    missing_required: missingLabels.slice(0, 8)
  }
  merged.requirements_check = {
    ...(merged.requirements_check || {}),
    score: ats.experienceScore,
    must_have: ats.requiredSkills.slice(0, 12),
    met: matchedLabels.slice(0, 8),
    unmet: missingLabels.slice(0, 8)
  }
  merged.semantic_fit = {
    ...(merged.semantic_fit || {}),
    score: ats.semanticScore,
    matched_responsibilities: matchedLabels.slice(0, 6),
    weak_or_missing_responsibilities: missingLabels.slice(0, 6)
  }
  merged.seniority_fit = {
    ...(merged.seniority_fit || {}),
    score: ats.seniorityScore,
    risk: ats.seniorityScore >= 70 ? 'low' : ats.seniorityScore >= 45 ? 'medium' : 'high'
  }
  merged.seniority = {
    ...(merged.seniority || {}),
    candidate_years: ats.candidateYears,
    job_years_required: ats.requiredYears,
    alignment: ats.seniorityScore >= 70 ? 'right_level' : 'under_level',
    alignment_label: ats.seniorityScore >= 70 ? 'Aligned' : 'Potential gap'
  }
  merged.critical_gaps = missingLabels.slice(0, 4)
  merged.rewrite_priorities = missingLabels.slice(0, 6)
  merged.proof_gaps = missingLabels.slice(0, 6)
  merged.confidence = {
    ...(merged.confidence || {}),
    level: ats.confidence,
    score: ats.confidence === 'medium' ? 70 : 45,
    reasons: [
      ...(Array.isArray(merged.confidence?.reasons) ? merged.confidence.reasons : []),
      'Final score calculated by deterministic ATS engine from extracted job and CV text.'
    ].slice(0, 4)
  }
  merged.deterministic_ats = ats
  merged.analysis_version = 'ats-v7-deterministic-quality-gate'
  return merged
}
