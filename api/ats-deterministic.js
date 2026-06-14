const COMMON_STOPWORDS = new Set([
  'avec','pour','dans','vous','nous','les','des','une','aux','sur','qui','que','par','plus','vos','nos','notre','votre','leur','leurs','afin','ainsi','poste','mission','profil','équipe','equipe','candidat','candidate','emploi','travail','entreprise','client','clients','projet','projets','expérience','experience',
  'the','and','for','with','your','our','this','that','from','role','team','work','working','job','candidate','company','business','project','projects','experience','skills','required','requirements','responsibilities','profile','about','will','have','has','are','you','we','they','their','them','into','within',
  'of','an','a','to','in','on','is','as','or','be','by','at','it','its','if','not','do','does','did','can','could','would','should','all','any','each','more','most','some','such','than','then','there','these','those','what','when','where','which','who','why','how','i','my','me','us'
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

const PAGE_NOISE_PATTERNS = [
  'sign in','sign up','sign in to','sign in to continue','continue to join','join now','join linkedin','authwall','login','log in','create account','privacy policy','cookie policy','cookies policy','user agreement','terms of service','terms and conditions','community of','jobs people learning','skip to main content','open app','download app','followers','connections','1 week ago','2 weeks ago','3 weeks ago','posted on','promoted','save job','show more','show less','see who','applicants','be among the first','share this job','copy link','of madrid spain','madrid community of'
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

const LANGUAGE_LABELS = { en: 'English', fr: 'French', es: 'Spanish', de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch' }

const LANGUAGE_MARKERS = {
  en: ['the','and','with','your','you','our','this','that','from','have','will','are','for','team','experience','requirements','responsibilities','role','skills','about','join','looking','years','strong'],
  fr: ['le','la','les','des','vous','nous','votre','notre','pour','dans','avec','une','poste','mission','equipe','recherchons','candidat','profil','sein','entreprise','competences','annees','et'],
  es: ['el','la','los','las','de','que','para','con','su','una','somos','equipo','experiencia','requisitos','empresa','trabajo','buscamos','anos','habilidades','y'],
  de: ['der','die','das','und','sie','mit','fur','ein','eine','wir','ihre','unternehmen','erfahrung','anforderungen','suchen','aufgaben','kenntnisse','jahre'],
  pt: ['o','a','os','as','de','que','para','com','uma','voce','equipe','experiencia','requisitos','empresa','trabalho','somos','procuramos','anos','habilidades','e'],
  it: ['il','la','le','gli','di','che','per','con','una','sei','esperienza','requisiti','azienda','cerchiamo','lavoro','competenze','anni'],
  nl: ['het','een','en','van','voor','met','je','jouw','wij','ons','ervaring','vereisten','bedrijf','baan','zoeken','vaardigheden','jaar']
}

export function detectTextLanguage(text = '') {
  const words = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length < 20) return { code: 'unknown', label: null }

  let best = { code: 'unknown', score: 0 }
  for (const [code, markers] of Object.entries(LANGUAGE_MARKERS)) {
    const markerSet = new Set(markers)
    const score = words.reduce((sum, word) => sum + (markerSet.has(word) ? 1 : 0), 0)
    if (score > best.score) best = { code, score }
  }

  if (best.score < 4 || best.score / words.length < 0.015) return { code: 'unknown', label: null }
  return { code: best.code, label: LANGUAGE_LABELS[best.code] }
}

function canonicalSkill(term = '') {
  const normalized = normalizeText(term)
  for (const [canonical, synonyms] of SKILL_SYNONYMS) {
    if (normalized === canonical || synonyms.some(syn => normalized === normalizeText(syn))) return canonical
  }
  return normalized
}

function isNoiseTerm(term = '') {
  const normalized = normalizeText(term)
  if (!normalized || normalized.length < 3) return true
  if (PAGE_NOISE_PATTERNS.some(pattern => normalized.includes(normalizeText(pattern)))) return true
  if (/^\d+\s+(day|days|week|weeks|month|months|hour|hours)\s+ago$/.test(normalized)) return true
  if (/^(of|in|at|to|for|from)\s+/.test(normalized) && normalized.split(' ').length <= 4) return true
  if (['privacy','policy','cookie','cookies','terms','agreement','community','madrid','spain','join','continue','signin','login'].includes(normalized)) return true
  return false
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
  const hardReasons = []
  const softReasons = []
  const lowerUrl = String(url || '').toLowerCase()
  const isUrl = source === 'url'
  const restricted = ['linkedin.', 'indeed.', 'glassdoor.', 'workday', 'welcometothejungle.com'].some(domain => lowerUrl.includes(domain))

  if (raw.length < 450) softReasons.push('The extracted job text is too short to score accurately.')
  if (normalized.length < 300) softReasons.push('The extracted job text has too little readable content.')

  // Only genuine anti-bot / login-wall / JS-shell signals belong here, since a
  // match HARD-blocks the analysis. Generic footer phrases like "privacy policy"
  // or "user agreement" appear on legitimate job pages too, so they are handled
  // as soft PAGE_NOISE_PATTERNS instead of hard blockers (see #70 regression).
  const blockedPatterns = [
    'enable javascript','please enable javascript','sign in to continue','login to continue','cookies must be enabled','access denied','are you a human','captcha','bot detection','cloudflare','temporarily unavailable','just a moment','error 403','forbidden','continue to join','join linkedin','sign in join now'
  ]
  if (blockedPatterns.some(pattern => normalized.includes(normalizeText(pattern)))) hardReasons.push('The URL appears to return a login, JavaScript, cookie, or anti-bot page instead of the job description.')

  const sectionHits = [
    'responsibilities','missions','mission','requirements','qualifications','profile','profil','skills','competences','compétences','experience','expérience','about the role','what you will do','your role','le poste','vos missions','what you bring','required skills','job description','responsabilites','requis'
  ].filter(term => normalized.includes(normalizeText(term))).length

  const actionWordHits = [
    'manage','lead','support','deploy','configure','maintain','monitor','implement','coordinate','develop','design','deliver','analyze','secure','migrate','pilot','gérer','piloter','déployer','configurer','maintenir','coordonner','analyser','sécuriser','build','own','operate','supervise','administer'
  ].filter(term => normalized.includes(normalizeText(term))).length

  if (sectionHits < 2 && actionWordHits < 4) softReasons.push('The extracted text does not contain enough visible responsibilities or requirements.')

  const navNoiseHits = PAGE_NOISE_PATTERNS.filter(term => normalized.includes(normalizeText(term))).length
  const meaningfulJobSignals = sectionHits + actionWordHits
  if (navNoiseHits >= 3 && meaningfulJobSignals < 8) softReasons.push('The extracted text looks more like page navigation or login content than a real job posting.')
  if (restricted && isUrl && navNoiseHits >= 2 && raw.length < 2200) softReasons.push('This restricted job board returned partial or noisy content instead of the full job description.')
  if (restricted && isUrl && sectionHits < 3 && actionWordHits < 7) softReasons.push('This restricted job board did not expose enough job responsibilities or requirements to score reliably.')

  const reasons = [...hardReasons, ...softReasons]
  const ok = reasons.length === 0
  // URL extractions are mostly out of the user's control, so only hard-block on
  // unusable content (anti-bot/login pages). Soft quality issues still get
  // surfaced via `quality`/`reasons`, but the analysis still runs. Pasted text
  // is fully within the user's control, so soft issues block it too.
  const blocked = hardReasons.length > 0 || (!isUrl && softReasons.length > 0)
  const quality = ok && raw.length >= 1800 && sectionHits >= 3 ? 'strong' : ok ? 'partial' : 'thin'

  return {
    ok,
    blocked,
    quality,
    reasons,
    source,
    restricted,
    minRecommendedChars: 450,
    message: ok ? null : restricted || isUrl
      ? 'We could not reliably extract the full job description from this URL. Paste the full job description in Accurate paste mode for a trustworthy ATS score.'
      : 'The pasted job description is too short or incomplete. Paste the full responsibilities and requirements for an accurate ATS score.'
  }
}

export function extractSkillTerms(text = '', limit = 18) {
  const normalized = normalizeText(text)
  const foundPatterns = TECH_PATTERNS.filter(term => containsTerm(normalized, term))
  // A bigram/trigram only counts as a candidate skill if every word in it is meaningful —
  // a single function word ("of", "we need an", "experience with active") makes the whole
  // n-gram a sentence fragment, not a skill, even though not *all* of its words are stopwords.
  const phraseMatches = [...normalized.matchAll(/\b(?:[a-z0-9+#.-]+\s+){0,2}[a-z0-9+#.-]+\b/g)]
    .map(match => match[0].trim())
    .filter(term => term.length >= 3 && term.length <= 35)
    .filter(term => !isNoiseTerm(term))
    .filter(term => !COMMON_STOPWORDS.has(term))
    .filter(term => term.split(' ').every(word => /[a-z0-9]/.test(word)))
    .filter(term => !term.split(' ').some(part => COMMON_STOPWORDS.has(part)))

  const scored = new Map()
  for (const term of [...foundPatterns, ...phraseMatches]) {
    const canonical = canonicalSkill(term)
    if (!canonical || isNoiseTerm(canonical) || COMMON_STOPWORDS.has(canonical)) continue
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

  // match_probability reflects interview chances rather than ATS keyword passthrough,
  // so it leans more on experience/seniority fit and less on raw keyword density.
  const matchProbability = Math.max(0, Math.min(100, Math.round(
    keywordScore * 0.20 +
    experienceScore * 0.30 +
    semanticScore * 0.25 +
    seniorityScore * 0.25 -
    criticalGapPenalty * 0.5
  )))

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
    matchProbability,
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

  const jobLanguage = detectTextLanguage(jobText)
  const cvLanguage = detectTextLanguage(cvText)
  merged.language_check = {
    job: jobLanguage,
    cv: cvLanguage,
    mismatch: jobLanguage.code !== 'unknown' && cvLanguage.code !== 'unknown' && jobLanguage.code !== cvLanguage.code
  }

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
  merged.match_probability = ats.matchProbability
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
    score: ats.seniorityScore,
    risk: ats.seniorityScore >= 70 ? 'low' : ats.seniorityScore >= 45 ? 'medium' : 'high'
  }
  merged.requirements_analysis = {
    ...(merged.requirements_analysis || {}),
    requirements_met: matchedLabels.slice(0, 8),
    requirements_missing: missingLabels.slice(0, 8)
  }
  merged.keywords_analysis = {
    ...(merged.keywords_analysis || {}),
    found_in_cv: matchedLabels.slice(0, 10),
    missing_keywords: missingLabels.slice(0, 10)
  }
  merged.gaps_to_address = unique([...(merged.gaps_to_address || []), ...missingLabels]).slice(0, 8)
  merged.quick_wins = unique([...(merged.quick_wins || []), ...missingLabels.slice(0, 4).map(skill => `Add truthful evidence for ${skill} if you have it.`)]).slice(0, 6)

  return merged
}
