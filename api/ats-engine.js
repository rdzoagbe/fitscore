const NOISE = new Set([
  'pourquoi','comment','choisir','faire','fait','premier','premiere','première','poste','profil','offre','description','rejoindre','postuler','candidatez','opportunite','opportunité','avec','dans','pour','vous','nous','les','des','une','aux','sur','qui','que','quoi','dont','est','sont','etre','être','avoir','plus','afin','ainsi','ce','ces','cet','cette','votre','notre','vos','nos','why','how','choose','make','apply','join','what','where','when','who','the','and','for','with','from','that','this','your','our','role','job','profile','skills','requirements','responsibilities'
])

const KEYWORDS = [
  'active directory','azure ad','entra id','microsoft 365','office 365','o365','m365','intune','endpoint manager','autopilot','defender','jamf','sccm','sharepoint','teams','exchange','powershell','graph api','azure','aws','gcp','cloud','terraform','ansible','kubernetes','docker','ci/cd','devops','sre','itil','sla','slo','kpi','servicenow','jira','zendesk','freshdesk','sql','power bi','power platform','crm','erp','yardi','api','rest api','integration','security','cybersecurity','network','firewall','vpn','identity','iam','sso','mfa','windows','linux','macos','helpdesk','service desk','support','incident','change management','problem management','asset management','budget','vendor','supplier','run','mco','production','infrastructure','architecture','migration','project management','stakeholder','leadership','manager','management','team management','people management','service delivery','onboarding','monitoring','availability','disaster recovery','backup','compliance','gdpr','iso 27001','ticketing','data center','datacenter','hardware','networking','mdm','edr','xdr','bcp','drp','business continuity','patch management','soc','react','vue','angular','next.js','node.js','typescript','javascript','python','java','c#','php','html','css','firebase','supabase','postgresql','mysql','mongodb','graphql'
]

const SYNONYMS = [
  ['microsoft 365','office 365','m365','o365'],
  ['azure ad','entra id'],
  ['intune','endpoint manager','microsoft endpoint manager'],
  ['service desk','helpdesk','it support','technical support'],
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
  ['manager','management','people management','team management','team leadership','leadership'],
  ['service delivery','it service delivery','service management'],
  ['react','react.js','reactjs'],
  ['vue','vue.js','vuejs'],
  ['node.js','nodejs'],
  ['next.js','nextjs'],
  ['javascript','js'],
  ['typescript','ts'],
  ['postgresql','postgres'],
  ['power bi','powerbi']
]

const MANAGEMENT_REQUIREMENTS = ['manager','management','leadership','team management','people management','service delivery','infrastructure management','operations management','multi-site operations','supervision','lead']
const MANAGEMENT_TITLES = ['head of','director','directeur','manager','responsable','lead','team leader','service delivery manager','it service delivery manager','head of corporate it','head of it','delivery manager','operations manager','it operations manager','supervisor','chef de service','responsable informatique']
const PROOF_VERBS = ['managed','led','supervised','coordinated','owned','implemented','deployed','migrated','automated','improved','reduced','created','built','piloted','responsable','dirige','dirigé','gere','géré','encadré','supervisé','deployé','déployé','automatisé','amélioré','réduit']

function clean(value = '') {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

function titleCase(value = '') {
  const known = { itil:'ITIL', sla:'SLA', slo:'SLO', kpi:'KPI', aws:'AWS', gcp:'GCP', api:'API', iam:'IAM', sso:'SSO', mfa:'MFA', edr:'EDR', xdr:'XDR', gdpr:'GDPR', sql:'SQL', crm:'CRM', erp:'ERP', mdm:'MDM', mco:'MCO', bcp:'BCP', drp:'DRP', 'ci/cd':'CI/CD', html:'HTML', css:'CSS', 'c#':'C#', soc:'SOC' }
  const normalized = clean(value)
  if (known[normalized]) return known[normalized]
  return String(value || '').trim().split(' ').map(part => known[clean(part)] || part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function unique(items = [], limit = 50) {
  const seen = new Set()
  const out = []
  for (const raw of items) {
    const item = String(raw || '').trim()
    const key = clean(item)
    if (!key || seen.has(key)) continue
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

function isNoise(value = '') {
  const key = clean(value)
  return !key || NOISE.has(key) || /^\d+$/.test(key) || key.split(' ').length > 4
}

function canonical(value = '') {
  const key = clean(value)
  for (const group of SYNONYMS) {
    if (group.map(clean).includes(key)) return titleCase(group[0])
  }
  return titleCase(value)
}

function aliasesFor(value = '') {
  const key = clean(value)
  const group = SYNONYMS.find(items => items.map(clean).includes(key))
  return group ? group.map(canonical) : [canonical(value)]
}

function hasTerm(text = '', term = '') {
  if (isNoise(term)) return false
  const haystack = clean(text)
  const needle = clean(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9+#.])${needle}([^a-z0-9+#.]|$)`).test(haystack)
}

function extractKeywords(text = '', limit = 40) {
  const body = clean(text)
  return unique(KEYWORDS.filter(term => body.includes(clean(term))).map(canonical).filter(item => !isNoise(item)), limit)
}

function extractYears(text = '') {
  const found = []
  const patterns = [/(\d{1,2})\s*\+?\s*(?:years|yrs|ans|annees|années)/gi, /(?:minimum|min\.?|at least|au moins)\s*(\d{1,2})/gi]
  for (const pattern of patterns) {
    for (const match of String(text || '').matchAll(pattern)) {
      const n = parseInt(match[1], 10)
      if (Number.isFinite(n) && n > 0 && n < 40) found.push(n)
    }
  }
  return found.length ? Math.max(...found) : 0
}

function extractDateRangeYears(text = '') {
  const currentYear = new Date().getFullYear()
  const spans = []
  for (const match of String(text || '').matchAll(/((?:19|20)\d{2})\s*(?:-|–|—|to|au|à)\s*((?:19|20)\d{2}|present|current|today|aujourd'hui|actuel)/gi)) {
    const start = parseInt(match[1], 10)
    const rawEnd = String(match[2]).toLowerCase()
    const end = /present|current|today|aujourd|actuel/.test(rawEnd) ? currentYear : parseInt(rawEnd, 10)
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start < 40) spans.push([start, end])
  }
  spans.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (!last || span[0] > last[1]) merged.push([...span])
    else last[1] = Math.max(last[1], span[1])
  }
  return Math.min(35, merged.reduce((sum, [start, end]) => sum + Math.max(0, end - start), 0))
}

function splitLines(text = '') {
  return String(text || '').split(/\r?\n|\./).map(line => line.trim()).filter(Boolean)
}

function extractJobTitle(jobText = '', aiContext = {}) {
  if (aiContext.job_title) return aiContext.job_title
  if (aiContext.title) return aiContext.title
  const line = splitLines(jobText).find(item => item.length <= 100 && /manager|responsable|lead|engineer|technician|support|director|consultant|administrator|developer|chef|expert|operations|infrastructure/i.test(item))
  return line || 'Not stated'
}

function extractCompany(jobText = '', aiContext = {}) {
  if (aiContext.company && aiContext.company !== 'Not specified') return aiContext.company
  const match = String(jobText || '').match(/(?:company|entreprise|société|societe)\s*[:\-]\s*([^\n.]+)/i)
  return match?.[1]?.trim() || 'Not stated'
}

function extractWorkMode(jobText = '', aiContext = {}) {
  const value = aiContext.work_mode
  if (value && value !== 'unknown') return value
  const text = clean(jobText)
  if (/remote|télétravail|teletravail|full remote/.test(text)) return 'remote'
  if (/hybrid|hybride/.test(text)) return 'hybrid'
  if (/onsite|on-site|sur site|présentiel|presentiel/.test(text)) return 'onsite'
  return 'Not stated'
}

function extractContract(jobText = '', aiContext = {}) {
  if (aiContext.contract_type && aiContext.contract_type !== 'unknown') return aiContext.contract_type
  const text = clean(jobText)
  if (/\bcdi\b/.test(text)) return 'CDI'
  if (/\bcdd\b/.test(text)) return 'CDD'
  if (/contract|freelance|consultant|mission/.test(text)) return 'Contract'
  return 'Not stated'
}

function extractSalary(jobText = '', aiContext = {}, salaryAssessment = {}) {
  if (aiContext.salary && aiContext.salary !== 'Not specified') return aiContext.salary
  if (aiContext.salary_range && aiContext.salary_range !== 'Not specified') return aiContext.salary_range
  const match = String(jobText || '').match(/(?:€|eur|euro|k€|k eur|salary|salaire|rémunération|remuneration)[^\n]{0,80}/i)
  if (match) return match[0].trim()
  if (salaryAssessment.assessment && salaryAssessment.assessment !== 'unknown') return salaryAssessment.assessment
  return 'Not stated'
}

function extractJobTitles(cvText = '') {
  const titlePattern = /\b(head of|director|directeur|manager|responsable|lead|team leader|service delivery|delivery manager|operations manager|it operations|it service|corporate it|chef|supervisor|référent|referent)\b/i
  const ignored = /^(skills|competences|compétences|education|formation|languages|langues|summary|profile|profil|certifications?)\b/i
  return unique(String(cvText || '').split(/\r?\n/).map(line => line.trim()).filter(line => line && line.length <= 140 && titlePattern.test(line) && !ignored.test(line)).map(line => line.replace(/^[•●▪\-*\s]+/, '').trim()), 14)
}

function roleEvidenceSkills(jobTitles = []) {
  const text = clean(jobTitles.join(' | '))
  const skills = []
  if (MANAGEMENT_TITLES.some(term => text.includes(clean(term)))) skills.push('Manager', 'Management', 'Leadership', 'Team Management', 'People Management')
  if (/service delivery|delivery manager|it service/.test(text)) skills.push('Service Delivery')
  if (/operations manager|it operations|infrastructure/.test(text)) skills.push('Infrastructure Management', 'Operations Management')
  return unique(skills, 12)
}

function extractSections(cvText = '') {
  const sections = {}
  let current = 'other'
  for (const raw of String(cvText || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const header = line.replace(/[:\-]/g, '').trim()
    if (/^(experience|professional experience|work experience|expériences?|experiences professionnelles|employment)$/i.test(header)) { current = 'experience'; sections[current] ||= []; continue }
    if (/^(skills|competences|compétences|technical skills|technologies)$/i.test(header)) { current = 'skills'; sections[current] ||= []; continue }
    if (/^(education|formation)$/i.test(header)) { current = 'education'; sections[current] ||= []; continue }
    sections[current] ||= []
    sections[current].push(line)
  }
  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.join('\n')]))
}

function parseCv(cvText = '') {
  const sections = extractSections(cvText)
  const jobTitles = extractJobTitles(cvText)
  const roleSkills = roleEvidenceSkills(jobTitles)
  const skills = unique([...extractKeywords([sections.skills, sections.experience, cvText].filter(Boolean).join('\n'), 60), ...roleSkills], 70)
  const warnings = []
  const tableLike = /\t| {4,}|\|/.test(cvText)
  if (!sections.experience || sections.experience.length < 200) warnings.push('No clear Experience section detected; ATS parsers rely heavily on standard headers.')
  if (!sections.skills || sections.skills.length < 40) warnings.push('No clear Skills section detected; keyword matching may be weaker.')
  if (tableLike) warnings.push('Table/column-like formatting detected; older ATS parsers may drop fields. Consider a single-column ATS CV if key titles are missing.')
  const parseQuality = clamp(58 + (cvText.length > 1200 ? 14 : 0) + (sections.experience ? 12 : 0) + (sections.skills ? 8 : 0) + (jobTitles.length ? 6 : 0) - (tableLike ? 8 : 0), 60)
  return {
    parse_quality: parseQuality,
    parser_risk: parseQuality >= 80 ? 'low' : parseQuality >= 60 ? 'medium' : 'high',
    warnings: unique(warnings, 6),
    schema: {
      extracted_skills: skills,
      job_titles: jobTitles,
      role_evidence_skills: roleSkills,
      candidate_years_signal: Math.max(extractYears(cvText), extractDateRangeYears(sections.experience || cvText)),
      text_length: cvText.length
    }
  }
}

function extractRequirements(jobText = '', keywords = []) {
  const requirements = []
  const lines = splitLines(jobText)
  const rules = [
    [/edr/i, 'EDR administration'],
    [/soc/i, 'SOC interface experience'],
    [/firewall/i, 'Firewall administration'],
    [/backup|disaster recovery|restore/i, 'Backup and disaster recovery'],
    [/patch/i, 'Patch management'],
    [/azure|cloud/i, 'Azure administration'],
    [/active directory|entra|azure ad/i, 'Active Directory experience'],
    [/m365|microsoft 365|office 365/i, 'M365 management'],
    [/infrastructure/i, 'Infrastructure management'],
    [/multi[-\s]?site|multi site|international/i, 'Multi-site operations'],
    [/support|service desk|helpdesk/i, 'IT support operations'],
    [/vendor|supplier|prestataire|infogerance|infogérance/i, 'Vendor management'],
    [/security|cyber/i, 'Security operations']
  ]
  for (const [regex, label] of rules) {
    if (regex.test(jobText)) requirements.push(label)
  }
  for (const line of lines) {
    if (/responsible|responsable|manage|gérer|gerer|administr|maintain|maintenir|support|coordinate|coordonner|ensure|assurer/i.test(line)) {
      for (const keyword of keywords) {
        if (hasTerm(line, keyword)) requirements.push(`${keyword} experience`)
      }
    }
  }
  return unique(requirements, 12)
}

function parseJob(jobText = '', ai = {}) {
  const allKeywords = extractKeywords(jobText, 60)
  const lines = splitLines(jobText)
  const requiredLines = lines.filter(line => /required|must|minimum|mandatory|essential|you have|you bring|required skills|profile|requirements|requis|obligatoire|minimum|expérience|competences|compétences|profil|maitrise|maîtrise|connaissance/i.test(line))
  const strictKeywords = extractKeywords(requiredLines.join('\n'), 30)
  const requiredKeywords = unique(strictKeywords.length ? strictKeywords : allKeywords.slice(0, 14), 16)
  const requirements = extractRequirements(jobText, requiredKeywords)
  return {
    job_title: extractJobTitle(jobText, ai.job_context || {}),
    company: extractCompany(jobText, ai.job_context || {}),
    work_mode: extractWorkMode(jobText, ai.job_context || {}),
    contract_type: extractContract(jobText, ai.job_context || {}),
    salary: extractSalary(jobText, ai.job_context || {}, ai.salary_assessment || {}),
    required_keywords: requiredKeywords,
    requirements,
    nice_to_have_keywords: unique(allKeywords.filter(item => !requiredKeywords.map(clean).includes(clean(item))).slice(0, 8), 10),
    minimum_years_experience: extractYears(jobText),
    text_quality: jobText.length > 1600 ? 'strong' : jobText.length > 700 ? 'usable' : 'thin'
  }
}

function titleMatchesRequirement(requirement = '', jobTitles = []) {
  const req = clean(requirement)
  const isManagement = MANAGEMENT_REQUIREMENTS.some(term => req.includes(clean(term))) || /infrastructure management|operations management|multi-site operations|service delivery/i.test(requirement)
  if (!isManagement) return ''
  const hit = jobTitles.find(title => MANAGEMENT_TITLES.some(term => clean(title).includes(clean(term))))
  return hit ? `Job title: ${hit}` : ''
}

function matchItem(item = '', candidateSkills = [], jobTitles = []) {
  const titleEvidence = titleMatchesRequirement(item, jobTitles)
  if (titleEvidence) return titleEvidence
  const itemAliases = aliasesFor(item).map(clean)
  for (const skill of candidateSkills) {
    if (aliasesFor(skill).map(clean).some(alias => itemAliases.includes(alias))) return canonical(skill)
  }
  return ''
}

function delta(items = [], candidateSkills = [], jobTitles = []) {
  const matched = []
  const missing = []
  for (const item of items) {
    if (isNoise(item)) continue
    const hit = matchItem(item, candidateSkills, jobTitles)
    if (hit) matched.push({ required_skill: canonical(item), matched_candidate_skill: hit })
    else missing.push(canonical(item))
  }
  return { matched, missing: unique(missing, 30) }
}

function contextFor(text = '', item = '') {
  const body = clean(text)
  let index = -1
  for (const alias of aliasesFor(item).map(clean)) {
    index = body.indexOf(alias)
    if (index >= 0) break
  }
  return index < 0 ? '' : String(text).slice(Math.max(0, index - 280), Math.min(String(text).length, index + 380))
}

function hasProof(text = '', item = '') {
  const context = contextFor(text, item)
  if (!context) return false
  const hasMetric = /\b\d+\s*(%|k|m|users|utilisateurs|devices|appareils|tickets|sla|sites|countries|pays|people|personnes|servers|serveurs)/i.test(context)
  const hasVerb = PROOF_VERBS.some(verb => hasTerm(context, verb))
  return hasMetric || hasVerb
}

function needsProof(matched = [], cvText = '') {
  return unique(matched.filter(item => {
    if (item.matched_candidate_skill.startsWith('Job title:')) return !/\b\d+\s*(%|k|m|people|personnes|team|teams|sites|countries|tickets|users|devices)/i.test(cvText)
    return !hasProof(cvText, item.matched_candidate_skill)
  }).map(item => item.required_skill), 12)
}

function buildQuickWins(missingKeywords = [], missingRequirements = [], proofNeeds = []) {
  const wins = []
  if (missingKeywords[0]) wins.push(`Add ${missingKeywords[0]} experience if true.`)
  if (missingRequirements[0]) wins.push(`Clarify ${missingRequirements[0]} with one concrete achievement.`)
  if (proofNeeds[0]) wins.push(`Add measurable proof for ${proofNeeds[0]} using scope, result, or ownership.`)
  if (missingKeywords.length > 1 && wins.length < 4) wins.push(`Mention ${missingKeywords.slice(1, 3).join(' and ')} naturally in your Skills or Experience section if accurate.`)
  if (missingRequirements.length > 1 && wins.length < 4) wins.push(`Prepare an interview explanation for ${missingRequirements.slice(1, 3).join(' and ')}.`)
  if (wins.length < 4) wins.push('Move the strongest matching tools and responsibilities into the top third of the CV.')
  if (wins.length < 4) wins.push('Use action-result bullets: action, tool, scope, measurable outcome.')
  return wins.slice(0, 4)
}

function buildJobSummary(job = {}) {
  const title = job.job_title || 'This role'
  const keyReq = job.requirements.slice(0, 3).join(', ')
  const keyTools = job.required_keywords.slice(0, 4).join(', ')
  return `${title} focuses on ${keyReq || 'core IT operations'}${keyTools ? ` using ${keyTools}` : ''}. The role is responsible for operational reliability, support quality, security, and business continuity.`
}

function buildScreeningSummary(score, found = [], missing = [], missingReq = []) {
  if (score >= 78) return `Strong technical match with ${found.slice(0, 3).join(', ') || 'several required skills'} and relevant operational experience.`
  if (missing.length || missingReq.length) return `Good base, but recruiter screening may focus on gaps around ${[...missing, ...missingReq].slice(0, 3).join(', ')}.`
  return 'Potential match, but the CV needs clearer proof and stronger keyword alignment before applying.'
}

export function enhanceAnalysisWithAts(analysis = {}, jobText = '', cvText = '') {
  const cv = parseCv(cvText)
  const job = parseJob(jobText, analysis)
  const keywordDelta = delta(job.required_keywords, cv.schema.extracted_skills, cv.schema.job_titles)
  const requirementDelta = delta(job.requirements, cv.schema.extracted_skills, cv.schema.job_titles)
  const allMatched = [...keywordDelta.matched, ...requirementDelta.matched]
  const proofNeeds = needsProof(allMatched, cvText)
  const skillScore = clamp((keywordDelta.matched.length / Math.max(job.required_keywords.length, 1)) * 100, 0)
  const requirementScore = clamp((requirementDelta.matched.length / Math.max(job.requirements.length, 1)) * 100, job.requirements.length ? 0 : 70)
  const yearsScore = job.minimum_years_experience ? clamp((cv.schema.candidate_years_signal / job.minimum_years_experience) * 100, cv.schema.candidate_years_signal ? 45 : 30) : 70
  const proofPenalty = Math.min(18, proofNeeds.length * 3)
  const finalScore = clamp(skillScore * 0.42 + requirementScore * 0.28 + yearsScore * 0.15 + cv.parse_quality * 0.15 - proofPenalty, 50)
  const verdict = finalScore >= 78 ? 'strong_shortlist' : finalScore >= 58 ? 'possible_shortlist' : 'unlikely_shortlist'
  const overall = finalScore >= 75 ? 'likely_passed' : finalScore >= 55 ? 'borderline' : 'likely_filtered'
  const quickWins = buildQuickWins(keywordDelta.missing, requirementDelta.missing, proofNeeds)
  const recruiterSummary = buildScreeningSummary(finalScore, keywordDelta.matched.map(item => item.required_skill), keywordDelta.missing, requirementDelta.missing)
  const jobSummary = analysis.job_summary || buildJobSummary(job)
  const gapList = unique([...requirementDelta.missing, ...proofNeeds], 8)
  const warnings = unique([...(analysis.format_warnings || []), ...cv.warnings], 8)

  const cleanJobContext = {
    job_title: job.job_title,
    title: job.job_title,
    company: job.company,
    job_summary: jobSummary,
    work_mode: job.work_mode,
    contract_type: job.contract_type,
    salary: job.salary,
    salary_range: job.salary,
    location: analysis.job_context?.location || 'Not stated',
    experience_required: job.minimum_years_experience ? `${job.minimum_years_experience}+ years` : 'Not stated',
    languages_required: analysis.job_context?.languages_required || [],
    apply_url: analysis.job_context?.apply_url || null,
    easy_apply: Boolean(analysis.job_context?.easy_apply),
    hiring_contact: analysis.job_context?.hiring_contact || null
  }

  const keywordsAnalysis = {
    found_in_cv: keywordDelta.matched.map(item => item.required_skill),
    missing_keywords: keywordDelta.missing
  }

  const requirementsAnalysis = {
    requirements_met: requirementDelta.matched.map(item => item.required_skill),
    requirements_missing: requirementDelta.missing
  }

  const strictAtsResult = {
    job_requirements: {
      required_skills: job.required_keywords,
      minimum_years_experience: job.minimum_years_experience || 0
    },
    candidate_profile: {
      candidate_skills: cv.schema.extracted_skills,
      total_years_experience: cv.schema.candidate_years_signal || 0,
      job_titles: cv.schema.job_titles
    },
    analysis: {
      matched_skills: keywordDelta.matched,
      missing_skills: keywordDelta.missing,
      needs_proof: proofNeeds,
      experience_gap_years: Math.max(0, (job.minimum_years_experience || 0) - (cv.schema.candidate_years_signal || 0))
    },
    quick_wins: quickWins,
    coaching_feedback: keywordDelta.missing.length
      ? `Good foundation, but the ATS may miss you on ${keywordDelta.missing.slice(0, 4).join(', ')}. Add those exact terms only if true and strengthen proof for matched skills.`
      : proofNeeds.length
        ? `The core keywords are visible. Add measurable proof for ${proofNeeds.slice(0, 4).join(', ')} so recruiters see impact quickly.`
        : 'Strong foundation: the required keywords are visible and supported well enough for an ATS/recruiter scan.'
  }

  return {
    ...analysis,
    job_context: cleanJobContext,
    job_summary: jobSummary,
    recruiter_screening_summary: recruiterSummary,
    keywords_analysis: keywordsAnalysis,
    requirements_analysis: requirementsAnalysis,
    gaps_to_address: gapList,
    quick_wins: quickWins,
    strict_ats_result: strictAtsResult,
    display_score: finalScore,
    match_probability: finalScore,
    keyword_match: {
      ...(analysis.keyword_match || {}),
      score: skillScore,
      found: keywordsAnalysis.found_in_cv,
      missing_required: keywordsAnalysis.missing_keywords,
      missing_nice: job.nice_to_have_keywords || [],
      keyword_stuffing_risk: 'low'
    },
    requirements_check: {
      ...(analysis.requirements_check || {}),
      score: requirementScore,
      must_have: job.requirements,
      nice_to_have: job.nice_to_have_keywords || [],
      met: requirementsAnalysis.requirements_met,
      unmet: requirementsAnalysis.requirements_missing
    },
    semantic_fit: {
      ...(analysis.semantic_fit || {}),
      score: requirementScore,
      matched_responsibilities: requirementDelta.matched.map(item => `${item.required_skill} → ${item.matched_candidate_skill}`).slice(0, 8),
      weak_or_missing_responsibilities: requirementsAnalysis.requirements_missing,
      domain_fit: finalScore >= 75 ? 'strong' : finalScore >= 55 ? 'moderate' : 'weak',
      domain_reason: 'Strict delta: missing keywords and requirements are only pulled from the job description; title evidence counts for management responsibilities.'
    },
    recruiter_shortlist: {
      ...(analysis.recruiter_shortlist || {}),
      probability: finalScore,
      verdict,
      reason: recruiterSummary,
      top_screening_factors: unique([...keywordsAnalysis.found_in_cv, ...requirementsAnalysis.requirements_met, ...cv.schema.job_titles], 8),
      likely_recruiter_concerns: unique([...keywordsAnalysis.missing_keywords, ...requirementsAnalysis.requirements_missing, ...proofNeeds], 8)
    },
    ats_pipeline: {
      strict_ats_result: strictAtsResult,
      ats_score: finalScore,
      extraction_phase: {
        cv_parse_quality: cv.parse_quality,
        parser_risk: cv.parser_risk,
        parser_warnings: warnings,
        cv_schema: cv.schema,
        job_schema: job
      },
      matching_algorithm: {
        score_breakdown: {
          cv_parser_quality: cv.parse_quality,
          exact_keyword_match: skillScore,
          requirements_match: requirementScore,
          semantic_match: requirementScore,
          proof_strength: clamp(100 - proofNeeds.length * 10, 50)
        },
        exact_keywords: { found: keywordsAnalysis.found_in_cv, missing_required: keywordsAnalysis.missing_keywords },
        semantic_matching: { matched: requirementDelta.matched, missing: requirementsAnalysis.requirements_missing },
        experience_proof: { needs_proof: proofNeeds, years_required: job.minimum_years_experience || 0, years_candidate_signal: cv.schema.candidate_years_signal || 0, job_titles_detected: cv.schema.job_titles }
      },
      recruiter_view: {
        rank_bucket: finalScore >= 78 ? 'Highly Qualified' : finalScore >= 62 ? 'Review / Maybe' : 'Low Priority',
        visibility: finalScore >= 78 ? 'top_of_shortlist' : finalScore >= 62 ? 'visible_if_recruiter_reviews_more_profiles' : 'bottom_of_pagination',
        shortlist_probability: finalScore,
        reason: recruiterSummary
      }
    },
    experience_depth: {
      ...(analysis.experience_depth || {}),
      score: clamp(100 - proofNeeds.length * 10, 50),
      metrics: proofNeeds.length ? 'weak_or_missing' : 'visible',
      leadership: cv.schema.job_titles.length ? 'visible' : 'unclear',
      proof_summary: proofNeeds.length ? `Needs proof for: ${proofNeeds.join(', ')}` : 'Matched skills and requirements have acceptable proof signals.'
    },
    proof_gaps: proofNeeds,
    critical_gaps: gapList,
    format_warnings: warnings,
    rewrite_priorities: unique([...keywordsAnalysis.missing_keywords, ...requirementsAnalysis.requirements_missing, ...proofNeeds], 10),
    overall_verdict: overall,
    overall_reason: keywordsAnalysis.missing_keywords.length
      ? `Missing JD keywords: ${keywordsAnalysis.missing_keywords.join(', ')}.`
      : requirementsAnalysis.requirements_missing.length
        ? `Missing JD requirements: ${requirementsAnalysis.requirements_missing.join(', ')}.`
        : proofNeeds.length
          ? `Matched items need stronger proof: ${proofNeeds.join(', ')}.`
          : 'Required keywords and responsibilities are matched and supported.',
    analysis_version: 'ats-v7-clean-ui-schema-compatible'
  }
}
