const COMMON_STOPWORDS = new Set([
  'avec','pour','dans','vous','nous','les','des','une','aux','sur','qui','que','par','plus','vos','nos','notre','votre','leur','leurs','afin','ainsi','poste','mission','profil','équipe','equipe','candidat','candidate','emploi','travail','entreprise','client','clients','projet','projets','expérience','experience',
  'the','and','for','with','your','our','this','that','from','role','team','work','working','job','candidate','company','business','project','projects','experience','skills','required','requirements','responsibilities','profile','about','will','have','has','are','you','we','they','their','them','into','within',
  'of','an','a','to','in','on','is','as','or','be','by','at','it','its','if','not','do','does','did','can','could','would','should','all','any','each','more','most','some','such','than','then','there','these','those','what','when','where','which','who','why','how','i','my','me','us',
  // French function words — without these, prose fragments like "commercial et la",
  // "de haut niveau", "du capital humain" leak through as fake "skills".
  'le','la','les','un','une','de','du','des','et','ou','où','à','au','aux','en','dans','sur','sous','par','pour','avec','sans','ce','cet','cette','ces','son','sa','ses','leur','notre','votre','est','sont','être','etre','avoir','plus','moins','très','tres','tout','tous','toute','toutes','d','l','n','s','t','qu','vos','nos','ainsi','afin','selon','entre','vers','chez','dont','car','mais','donc','ni','soit'
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

// Multilingual skill lexicon: a canonical (normalized, English) skill mapped to its
// surface forms across languages. Forms are matched as substrings after normalization
// (accents stripped, lowercased), so a French job's "gestion de projet" and an English
// CV's "project management" both resolve to the canonical "project management". This
// makes cross-language extraction AND matching reliable instead of merely deferred.
const SKILL_LEXICON = [
  ['project management', ['project management','gestion de projet','gestion de projets','conduite de projet','gestion de proyectos','projektmanagement','gestao de projetos','gestione progetti','projectmanagement']],
  ['program management', ['program management','gestion de programme','gestion de programa','programmmanagement']],
  ['team management', ['team management','people management','gestion d equipe','management d equipe','encadrement d equipe','encadrement','gestion de equipos','teamfuhrung','gestao de equipe','gestione del team','teammanagement']],
  ['leadership', ['leadership','liderazgo','lideranca','fuhrung','leiderschap']],
  ['communication', ['communication','comunicacion','kommunikation','comunicacao','comunicazione','communicatie']],
  ['customer relationship', ['customer relationship','relation client','relation clients','gestion de la relation client','customer relationship management','crm','atencion al cliente','relacion con el cliente','kundenbeziehung','relacionamento com o cliente']],
  ['customer service', ['customer service','service client','service clients','servicio al cliente','kundenservice','atendimento ao cliente','assistenza clienti','klantenservice']],
  ['sales', ['sales','vente','ventes','ventas','vertrieb','vendas','vendite','verkoop']],
  ['business development', ['business development','developpement commercial','developpement des affaires','desarrollo de negocio','geschaftsentwicklung','desenvolvimento de negocios','sviluppo commerciale']],
  ['marketing', ['marketing','mercadeo','mercadotecnia']],
  ['digital marketing', ['digital marketing','marketing digital','marketing numerique','digitales marketing']],
  ['accounting', ['accounting','comptabilite','contabilidad','buchhaltung','contabilidade','contabilita','boekhouding']],
  ['finance', ['finance','finanzas','finanzen','financas','financa','finanza','financien']],
  ['budget management', ['budget management','gestion budgetaire','gestion du budget','gestion de presupuesto','budgetverwaltung','gestao orcamentaria']],
  ['profit and loss management', ['profit and loss','p l management','p l ownership','compte de resultat','perdidas y ganancias','gewinn und verlust','demonstracao de resultados']],
  ['human resources', ['human resources','ressources humaines','recursos humanos','personalwesen','risorse umane','personeelszaken']],
  ['recruitment', ['recruitment','recruiting','recrutement','reclutamiento','rekrutierung','recrutamento','reclutamento','werving']],
  ['training', ['training','formation','formacion','schulung','formacao','formazione','opleiding']],
  ['negotiation', ['negotiation','negociation','negociacion','verhandlung','negociacao','negoziazione','onderhandeling']],
  ['problem solving', ['problem solving','resolution de problemes','resolucion de problemas','problemlosung','resolucao de problemas','problem-solving','probleemoplossing']],
  ['data analysis', ['data analysis','analyse de donnees','analisis de datos','datenanalyse','analise de dados','analisi dei dati','data-analyse']],
  ['strategy', ['strategy','strategie','estrategia','strategia']],
  ['consulting', ['consulting','conseil','consultoria','beratung','consulenza','advies']],
  ['digital transformation', ['digital transformation','transformation digitale','transformation numerique','transformacion digital','digitale transformation','transformacao digital','trasformazione digitale','digitale transformatie']],
  ['agile', ['agile','agil','methode agile','metodologia agil','metodo agile']],
  ['scrum', ['scrum']],
  ['software development', ['software development','developpement logiciel','desarrollo de software','softwareentwicklung','desenvolvimento de software','sviluppo software','softwareontwikkeling']],
  ['web development', ['web development','developpement web','desarrollo web','webentwicklung','desenvolvimento web','sviluppo web','webontwikkeling']],
  ['quality assurance', ['quality assurance','assurance qualite','controle qualite','aseguramiento de la calidad','qualitatssicherung','garantia de qualidade','controllo qualita']],
  ['supply chain', ['supply chain','chaine d approvisionnement','chaine logistique','cadena de suministro','lieferkette','cadeia de suprimentos','catena di fornitura','toeleveringsketen']],
  ['logistics', ['logistics','logistique','logistica','logistik','logistiek']],
  ['procurement', ['procurement','purchasing','achats','approvisionnement','compras','einkauf','beschaffung','acquisti','inkoop']],
  ['audit', ['audit','auditoria','auditing','wirtschaftsprufung']],
  ['reporting', ['reporting','reportes','informes','berichterstattung','relatorios','rapportage']],
  ['teamwork', ['teamwork','travail d equipe','travail en equipe','trabajo en equipo','teamarbeit','trabalho em equipe','lavoro di squadra','samenwerking']],
  ['autonomy', ['autonomy','autonomie','autonomia']],
  ['project planning', ['project planning','planification','planificacion','planejamento','pianificazione','planung']],
  ['risk management', ['risk management','gestion des risques','gestion de riesgos','risikomanagement','gestao de riscos','gestione del rischio','risicomanagement']],
  ['change management', ['change management','conduite du changement','gestion du changement','gestion del cambio','anderungsmanagement','gestao da mudanca','gestione del cambiamento','verandermanagement']],
  ['product management', ['product management','gestion de produit','gestion de producto','produktmanagement','gestao de produto','product owner']],
  ['stakeholder management', ['stakeholder management','gestion des parties prenantes','gestion de partes interesadas','stakeholdermanagement']],
  ['presentation', ['presentation','presentaciones','prasentation','apresentacao','presentazione','presentatie']],
  ['business analysis', ['business analysis','analyse metier','analyse fonctionnelle','analisis de negocio','geschaftsanalyse','analise de negocios']],
  ['account management', ['account management','gestion de comptes','gestion de cuentas','kundenbetreuung','gestao de contas','gestione clienti']],
  ['pre-sales', ['pre-sales','presales','avant-vente','preventa','vorverkauf','prevendita']],
  ['mentoring', ['mentoring','mentorat','mentoria','mentoring']],
  ['process improvement', ['process improvement','amelioration des processus','mejora de procesos','prozessverbesserung','melhoria de processos','miglioramento dei processi']],
  ['compliance', ['compliance','conformite','cumplimiento','conformidade','conformita','naleving']]
]

// All language-neutral canonical skills (tech + multilingual lexicon). A required
// skill that maps to one of these is "known" — trustworthy regardless of the job's
// language — versus a raw prose n-gram guessed out of a sentence.
const KNOWN_CANONICAL_SKILLS = new Set([
  ...TECH_PATTERNS.map(term => term),
  ...SKILL_LEXICON.map(([canonical]) => canonical)
])

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

// True when a token is really part of a URL / tracking query-string / percent-encoding
// rather than a job skill. Failed restricted-board extractions (e.g. a LinkedIn redirect
// page) leave the raw URL behind, and `https://fr.linkedin.com/jobs/view/441...?trk=...`
// decodes into tokens like "https", "www.linkedin.com", "3a", "2f", "trk", "aero-v1".
function looksLikeUrlNoise(term = '') {
  const t = normalizeText(term)
  if (!t) return true
  if (/\b(https?|www|ftp)\b/.test(t)) return true
  if (/[a-z0-9-]+\.(com|net|org|io|ai|co|app|dev|fr|uk|de|es|eu|us|nl|it|pt|ca)\b/.test(t)) return true
  if (/linkedin|indeed|glassdoor|welcometothejungle|workday/.test(t)) return true
  if (/\b[0-9a-f]?2f[a-z0-9]*\b/.test(t)) return true   // %2F leftovers: 2f, 2fwww, 2fjobs, 2ffr
  if (/\b3a\b/.test(t)) return true                     // %3A leftover (the ":" in "https://")
  if (/\b(trk|utm[_a-z]*|ref|aero(-v\d+)?|sessionid|gclid|fbclid)\b/.test(t)) return true
  if (/\b\d{5,}\b/.test(t)) return true                 // long numeric ids (job ids)
  return false
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
  for (const [canonical, forms] of SKILL_LEXICON) {
    if (normalized === canonical || forms.some(form => normalized === normalizeText(form))) return canonical
  }
  return normalized
}

// Find which canonical lexicon skills appear in the text, in any supported language.
// Used alongside TECH_PATTERNS so multilingual business/soft skills extract cleanly
// instead of leaking through as prose fragments.
function escapeRegExp(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function lexiconSkillsIn(text = '') {
  const normalized = normalizeText(text)
  const found = []
  for (const [canonical, forms] of SKILL_LEXICON) {
    // Match on alphanumeric word boundaries so adjacent punctuation (e.g. a trailing
    // "." that normalizeText keeps for tokens like "node.js") doesn't hide a skill.
    if (forms.some(form => {
      const f = normalizeText(form)
      return f && new RegExp(`(^|[^a-z0-9])${escapeRegExp(f)}([^a-z0-9]|$)`).test(normalized)
    })) found.push(canonical)
  }
  return found
}

function isNoiseTerm(term = '') {
  const normalized = normalizeText(term)
  if (!normalized || normalized.length < 3) return true
  if (looksLikeUrlNoise(normalized)) return true
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
  // Cross-language equivalence: matching a canonical skill should match any of its
  // surface forms in the text, so an English required skill hits a French CV (or vice versa).
  for (const [canonical, forms] of SKILL_LEXICON) {
    if (normalizedTerm === canonical || forms.some(form => normalizedTerm === normalizeText(form))) {
      terms.push(canonical, ...forms.map(normalizeText))
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

  // A failed restricted-board extraction (e.g. a LinkedIn redirect/login page) leaves
  // mostly the raw URL + tracking params behind, which would otherwise be scored as if
  // the query-string were job "keywords". If the readable text is dominated by URL noise
  // and carries almost no real job signal, treat it as unusable rather than score junk.
  const words = normalized.split(' ').filter(Boolean)
  const urlNoiseWords = words.filter(word => looksLikeUrlNoise(word)).length
  const urlNoiseRatio = words.length ? urlNoiseWords / words.length : 0
  if (urlNoiseRatio >= 0.25 && meaningfulJobSignals < 6) hardReasons.push('The extracted content is mostly a link/redirect rather than the job description itself.')
  // Anything this short never contains a scorable job description, so block it even for
  // URLs (soft "too short" issues otherwise pass through for URL sources).
  if (raw.length < 220) hardReasons.push('The extracted job text is too short to contain a real job description — the page likely returned a redirect or login wall.')

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
  // Only recognized, canonical skills are returned: known tech (TECH_PATTERNS) and the
  // multilingual lexicon. We deliberately do NOT guess skills from raw prose n-grams —
  // those produced misleading junk like "technology -strategy" or "v beta t" in any
  // language. A clean short list beats a noisy long one; recall is grown by the lexicon
  // (and the AI step), not by scraping sentence fragments.
  const foundPatterns = TECH_PATTERNS.filter(term => containsTerm(normalized, term))
  const foundLexicon = lexiconSkillsIn(normalized)

  const scored = new Map()
  for (const term of [...foundPatterns, ...foundLexicon]) {
    const canonical = canonicalSkill(term)
    if (!canonical || isNoiseTerm(canonical) || COMMON_STOPWORDS.has(canonical)) continue
    scored.set(canonical, (scored.get(canonical) || 0) + 1)
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([term]) => term)
    .slice(0, limit)
}

export function estimateYears(text = '') {
  const normalized = normalizeText(text)
  const explicit = [...normalized.matchAll(/(\d{1,2})\s*\+?\s*(?:years|ans|annees|anos|jahre|anni|jaar)/g)]
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

  // Decide whether the keyword overlap is trustworthy enough to drive the headline
  // score. It is NOT when the job and CV are in different languages (literal matching
  // breaks) or when extraction found few genuine skills (known tech terms or crisp
  // single-word skills) versus prose fragments. In those cases the caller should
  // defer to the AI's semantic read instead of this keyword estimate.
  const jobLang = detectTextLanguage(jobText)
  const cvLang = detectTextLanguage(cvText)
  const languageMismatch = jobLang.code !== 'unknown' && cvLang.code !== 'unknown' && jobLang.code !== cvLang.code
  // The multilingual lexicon resolves skills to language-neutral canonicals, so a
  // cross-language job/CV pair is still trustworthy as long as enough required skills
  // map to known canonical skills. Only when too few do (mostly prose fragments) is the
  // keyword signal unreliable and the caller should defer to the AI's semantic read.
  const knownSkillCount = requiredSkills.filter(skill => KNOWN_CANONICAL_SKILLS.has(canonicalSkill(skill))).length
  const keywordSignalReliable = knownSkillCount >= 3

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
    languageMismatch,
    keywordSignalReliable,
    confidence: !keywordSignalReliable ? 'low' : requiredSkills.length >= 6 ? 'medium' : 'low'
  }
}

export function applyDeterministicAts(analysis, jobText = '', cvText = '') {
  const ats = buildDeterministicAts(jobText, cvText)
  const merged = { ...(analysis || {}) }
  const matchedLabels = ats.matchedSkills.map(item => item.required_skill)
  const missingLabels = ats.missingSkills

  // Capture the AI's own read BEFORE we overwrite these fields with deterministic
  // values, so we can defer to it when keyword matching isn't trustworthy.
  const aiSemantic = Number(analysis?.semantic_fit?.score)
  const aiRecruiter = Number(analysis?.recruiter_shortlist?.probability)

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

  merged.keyword_signal_reliable = ats.keywordSignalReliable
  merged.language_check.mismatch = merged.language_check.mismatch || ats.languageMismatch

  if (!ats.keywordSignalReliable) {
    // Keyword overlap can't be trusted here (cross-language or junk extraction), so
    // defer the headline to the AI's semantic read; if the AI didn't run, fall back
    // to language-independent experience/seniority rather than a keyword-tanked score.
    const deferred = Number.isFinite(aiSemantic) && aiSemantic > 0
      ? Math.round(aiSemantic * 0.6 + ats.experienceScore * 0.4)
      : Math.round(ats.experienceScore * 0.5 + ats.seniorityScore * 0.3 + 60 * 0.2)
    merged.display_score = Math.max(0, Math.min(100, deferred))
    merged.match_probability = Number.isFinite(aiRecruiter) && aiRecruiter > 0 ? Math.round(aiRecruiter) : merged.display_score
    merged.overall_verdict = merged.display_score >= 75 ? 'likely_passed' : merged.display_score >= 55 ? 'borderline' : 'likely_filtered'
    // Extraction only ever yields recognized canonical skills now, so the missing list
    // (if any) is clean and genuinely useful guidance — keep it rather than blanking it.
    // The score is still deferred and confidence lowered because keyword *coverage* is thin.
    if (!Number.isFinite(aiSemantic)) merged.confidence = { ...(merged.confidence || {}), level: 'low' }
  }

  return merged
}
