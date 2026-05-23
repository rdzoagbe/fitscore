/*
  Fixed LinkedIn profile optimizer API handler.

  Drop this file into:
    - Next.js Pages Router: /pages/api/linkedin-optimize.js
    - Vercel serverless function: /api/linkedin-optimize.js, depending on your project layout

  It is deliberately testable without Anthropic installed or configured. If ANTHROPIC_API_KEY
  is missing, it returns a deterministic rule-based analysis so the frontend can still be tested.
*/

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const MAX = {
  headline: 220,
  about: 3000,
  experience: 4000,
  skills: 1200,
  targetRole: 180,
  fetchedProfile: 9000
}

const SYSTEM = `You are a LinkedIn profile optimization expert with 10+ years coaching senior professionals. You analyze profiles for recruiter-friendliness, keyword density, scannability, personal brand clarity, target-role alignment, hooks, measurable results, and LinkedIn search visibility.

Rules:
- Give specific, copy-paste-ready rewrites.
- Never invent experience, certifications, employers, metrics, awards, or achievements that are not in the original profile.
- Optimize wording and structure only.
- If information is missing, say exactly what the user should add and mark it as a missing section.
- Return valid JSON only.`

function setCors(res) {
  res.setHeader?.('Access-Control-Allow-Origin', '*')
  res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function asString(value, max = 4000) {
  if (typeof value !== 'string') return ''
  return value.replace(/\u0000/g, '').trim().slice(0, max)
}

function parseBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body
}

function isAllowedLang(lang) {
  return ['en', 'fr', 'es', 'de', 'it', 'pt'].includes(lang)
}

function isLinkedInProfileUrl(value) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const isLinkedInHost = hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')
    const path = url.pathname.replace(/\/+$/, '')
    const isProfilePath = /^\/(in|pub)\/[^/]+/i.test(path)
    return url.protocol.startsWith('http') && isLinkedInHost && isProfilePath
  } catch {
    return false
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

async function fetchLinkedInProfile(profileUrl) {
  if (!isLinkedInProfileUrl(profileUrl)) {
    throw new Error('Please provide a valid LinkedIn profile URL, for example https://www.linkedin.com/in/yourname.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  let response
  try {
    response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    })
  } catch (error) {
    throw new Error('Could not reach LinkedIn. Please use paste mode instead.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error('LinkedIn blocked automated profile reading. Please use paste mode instead.')
  }

  const html = await response.text()
  const text = decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const lower = text.toLowerCase()
  const looksLikeAuthWall = [
    'sign in to view',
    'join linkedin',
    'authwall',
    'login',
    'checkpoint',
    'unusual traffic'
  ].some(signal => lower.includes(signal))

  const hasProfileSignals = ['experience', 'about', 'skills', 'education', 'activity'].some(signal => lower.includes(signal))

  if (text.length < 1200 || looksLikeAuthWall || !hasProfileSignals) {
    throw new Error('LinkedIn returned a login wall instead of public profile content. Please use paste mode instead.')
  }

  return text.slice(0, MAX.fetchedProfile)
}

function extractSection(text, startLabels, endLabels) {
  const lower = text.toLowerCase()
  let start = -1
  let usedLabel = ''

  for (const label of startLabels) {
    const index = lower.indexOf(label.toLowerCase())
    if (index !== -1 && (start === -1 || index < start)) {
      start = index
      usedLabel = label
    }
  }
  if (start === -1) return ''

  const from = start + usedLabel.length
  let end = text.length
  for (const label of endLabels) {
    const index = lower.indexOf(label.toLowerCase(), from + 20)
    if (index !== -1 && index < end) end = index
  }

  return text.slice(from, end).replace(/\s{2,}/g, ' ').trim()
}

function parseProfileBlobLocally(blob) {
  const cleaned = asString(blob, MAX.fetchedProfile)
  const headline = cleaned.split(/\n|\r| {2,}/).map(x => x.trim()).filter(Boolean)[0] || ''
  const about = extractSection(cleaned, ['About', 'À propos', 'Summary', 'Résumé'], ['Experience', 'Expérience', 'Activity', 'Education', 'Formation', 'Skills', 'Compétences'])
  const experience = extractSection(cleaned, ['Experience', 'Expérience'], ['Education', 'Formation', 'Skills', 'Compétences', 'Licenses', 'Certifications', 'Recommendations'])
  const skills = extractSection(cleaned, ['Skills', 'Compétences'], ['Recommendations', 'Recommandations', 'Interests', 'Centres d’intérêt'])
  return { headline: headline.slice(0, MAX.headline), about, experience, skills }
}

async function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const mod = await import('@anthropic-ai/sdk')
  const Anthropic = mod.default || mod.Anthropic
  return new Anthropic({ apiKey })
}

function stripCodeFence(raw) {
  return String(raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function parseJsonFromAi(raw) {
  const cleaned = stripCodeFence(raw)
  try { return JSON.parse(cleaned) } catch {}

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return JSON.parse(cleaned.slice(start, end + 1))
  }
  throw new Error('AI response was not valid JSON.')
}

function langInstruction(lang) {
  return {
    en: 'Write all output in English.',
    fr: 'Rédige toutes les sorties en français.',
    es: 'Escribe toda la salida en español.',
    de: 'Schreibe alle Ausgaben auf Deutsch.',
    it: "Scrivi tutto l'output in italiano.",
    pt: 'Escreve todo o output em português.'
  }[lang] || 'Write all output in English.'
}

async function parseProfileBlobWithAi(blob, lang) {
  const client = await getAnthropicClient()
  if (!client) return parseProfileBlobLocally(blob)

  const prompt = `Below is raw text from a LinkedIn profile. Extract the main sections.

Return only valid JSON with this exact shape:
{
  "headline": "short professional title line, <=220 chars",
  "about": "the About/Summary section, full text",
  "experience": "recent 2-3 experience entries: title + company + bullets",
  "skills": "comma-separated list of skills found, max 30"
}

If a section is missing, return an empty string. Do not fabricate.
${langInstruction(lang)}

RAW TEXT:
"""
${blob.slice(0, 7500)}
"""`

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 1800,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = message.content.map(block => block.text || '').join('').trim()
  return parseJsonFromAi(raw)
}

function wordCount(text) {
  return asString(text, 10000).split(/\s+/).filter(Boolean).length
}

function splitSkills(skillsText) {
  return asString(skillsText, MAX.skills)
    .split(/[,;\n•|]/)
    .map(skill => skill.trim())
    .filter(Boolean)
    .filter((skill, index, arr) => arr.findIndex(s => s.toLowerCase() === skill.toLowerCase()) === index)
    .slice(0, 30)
}

function clampInt(value, min, max, fallback = 0) {
  const number = Number.parseInt(value, 10)
  if (Number.isNaN(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

function takeSentence(text, fallback) {
  const cleaned = asString(text, 1200).replace(/\s+/g, ' ')
  if (!cleaned) return fallback
  const parts = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned]
  return parts.slice(0, 2).join(' ').trim()
}

function truncate(text, max) {
  const clean = asString(text, max + 100).replace(/\s+/g, ' ')
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trim()}…`
}

function localScore({ headline, about, experience, skills }) {
  let score = 15
  if (headline.length >= 20) score += 20
  if (about.length >= 250) score += 25
  else if (about.length >= 80) score += 12
  if (experience.length >= 250) score += 20
  else if (experience.length >= 80) score += 10
  if (splitSkills(skills).length >= 8) score += 15
  else if (splitSkills(skills).length >= 3) score += 8
  if (/\d|%|€|\$|£|kpi|sla|roi|users|devices|tickets/i.test(`${about} ${experience}`)) score += 5
  return Math.max(0, Math.min(100, score))
}

function buildLocalOptimization({ headline, about, experience, skills, targetRole, lang, warning }) {
  const role = targetRole || 'your target role'
  const skillList = splitSkills(skills)
  const topSkills = skillList.slice(0, 3)
  const score = localScore({ headline, about, experience, skills })
  const aboutIntro = about
    ? takeSentence(about, '')
    : `Add a concise About section explaining your positioning for ${role}, your strongest areas of expertise, and two verified achievements.`

  const improvedHeadlineBase = headline
    ? `${headline}${targetRole && !headline.toLowerCase().includes(targetRole.toLowerCase()) ? ` | Targeting ${targetRole}` : ''}`
    : `${targetRole || 'Professional profile'} | Add your core expertise and measurable impact`

  const improvedAbout = about
    ? `${aboutIntro}\n\nKey strengths: ${topSkills.length ? topSkills.join(' · ') : 'add your strongest verified skills'}.\n\nI focus on clear execution, measurable outcomes, and cross-functional collaboration. Before publishing, add 1-2 verified metrics from your real experience to strengthen credibility.`
    : aboutIntro

  const firstExperienceTitle = experience
    ? truncate(experience.split(/\n|\r/).find(Boolean) || 'Recent experience', 80)
    : 'Experience section to add'

  return {
    overall_score: score,
    score_explanation: warning
      ? `Basic local analysis completed. ${warning}`
      : 'Basic local analysis completed from the pasted LinkedIn content.',
    headline: {
      current_score: headline.length >= 20 ? 7 : 3,
      issues: [
        headline.length < 20 ? 'Headline is too short to communicate positioning clearly.' : 'Headline can be sharper by aligning it to the target role.',
        targetRole ? 'Target role should be visible in the first line.' : 'Add a clear target role to improve recruiter matching.'
      ].slice(0, 3),
      improved_version: truncate(improvedHeadlineBase, MAX.headline),
      improved_score: headline.length >= 20 ? 8 : 6,
      why_better: 'It makes the positioning more explicit and easier for recruiters to scan.'
    },
    about: {
      current_score: about.length >= 250 ? 7 : about.length >= 80 ? 5 : 2,
      issues: [
        about.length < 250 ? 'About section is too short or missing, so it does not build enough credibility.' : 'About section would be stronger with a tighter hook and clearer proof points.',
        'Add measurable outcomes only where you can verify them.'
      ],
      improved_version: improvedAbout,
      improved_score: about.length >= 250 ? 8 : 6,
      why_better: 'It adds a clearer opening, scannable strengths, and a concrete reminder to include verified evidence.'
    },
    experience: {
      current_score: experience.length >= 250 ? 7 : experience.length >= 80 ? 5 : 2,
      issues: [
        experience.length < 80 ? 'Experience content is missing or too short for a strong profile analysis.' : 'Experience entries should lead with action verbs and outcomes.',
        'LinkedIn experience should be concise and proof-oriented, not a full CV copy.'
      ],
      improvements: [{
        role_title: firstExperienceTitle,
        improved_bullets: experience
          ? [
              `Clarified scope and responsibilities based on: ${truncate(takeSentence(experience, 'your recent experience'), 160)}`,
              'Add one verified measurable result, such as volume, SLA, cost saving, delivery time, team size, or user impact.',
              targetRole ? `Prioritize achievements most relevant to ${targetRole}.` : 'Prioritize achievements most relevant to your next role.'
            ]
          : ['Add your job title, company, scope, key responsibilities, and 2-3 verified achievements.']
      }],
      general_advice: 'Use 3-5 concise bullets per recent role. Start with impact, then explain scope and tools.'
    },
    skills: {
      current_score: skillList.length >= 8 ? 7 : skillList.length >= 3 ? 5 : 2,
      to_add: targetRole ? [targetRole].filter(roleName => !skillList.some(s => s.toLowerCase() === roleName.toLowerCase())) : [],
      to_remove: [],
      to_reorder_top_3: topSkills.length ? topSkills : ['Add your top 3 verified skills'],
      rationale: 'Pinned skills should match the role you want and the evidence in your profile.'
    },
    quick_wins: [
      'Make sure the first 80 characters of the headline say exactly what you do.',
      'Add 2-3 verified metrics to About or Experience.',
      'Pin the three most relevant skills for the target role.',
      'Remove vague claims that are not backed by experience.'
    ],
    honest_disclaimer: 'Review carefully before publishing. The tool improves wording but does not verify facts.',
    warning: warning || ''
  }
}

function normalizeResult(result, fallbackInput = {}) {
  const normalized = result && typeof result === 'object' ? result : {}
  const safeArray = value => Array.isArray(value) ? value.map(String).filter(Boolean) : []
  const safe10 = value => clampInt(value, 0, 10, 0)

  normalized.overall_score = clampInt(normalized.overall_score, 0, 100, 0)
  normalized.score_explanation = asString(normalized.score_explanation, 800)

  normalized.headline = normalized.headline && typeof normalized.headline === 'object' ? normalized.headline : {}
  normalized.headline.current_score = safe10(normalized.headline.current_score)
  normalized.headline.improved_score = safe10(normalized.headline.improved_score)
  normalized.headline.issues = safeArray(normalized.headline.issues).slice(0, 3)
  normalized.headline.improved_version = asString(normalized.headline.improved_version || fallbackInput.headline, MAX.headline)
  normalized.headline.why_better = asString(normalized.headline.why_better, 800)

  normalized.about = normalized.about && typeof normalized.about === 'object' ? normalized.about : {}
  normalized.about.current_score = safe10(normalized.about.current_score)
  normalized.about.improved_score = safe10(normalized.about.improved_score)
  normalized.about.issues = safeArray(normalized.about.issues).slice(0, 3)
  normalized.about.improved_version = asString(normalized.about.improved_version || fallbackInput.about, 5000)
  normalized.about.why_better = asString(normalized.about.why_better, 800)

  normalized.experience = normalized.experience && typeof normalized.experience === 'object' ? normalized.experience : {}
  normalized.experience.current_score = safe10(normalized.experience.current_score)
  normalized.experience.issues = safeArray(normalized.experience.issues).slice(0, 3)
  normalized.experience.improvements = Array.isArray(normalized.experience.improvements) ? normalized.experience.improvements.slice(0, 5).map(item => ({
    role_title: asString(item?.role_title || 'Experience', 160),
    improved_bullets: safeArray(item?.improved_bullets).slice(0, 5)
  })) : []
  normalized.experience.general_advice = asString(normalized.experience.general_advice, 1000)

  normalized.skills = normalized.skills && typeof normalized.skills === 'object' ? normalized.skills : {}
  normalized.skills.current_score = safe10(normalized.skills.current_score)
  normalized.skills.to_add = safeArray(normalized.skills.to_add).slice(0, 8)
  normalized.skills.to_remove = safeArray(normalized.skills.to_remove).slice(0, 8)
  normalized.skills.to_reorder_top_3 = safeArray(normalized.skills.to_reorder_top_3).slice(0, 3)
  normalized.skills.rationale = asString(normalized.skills.rationale, 800)

  normalized.quick_wins = safeArray(normalized.quick_wins).slice(0, 5)
  normalized.honest_disclaimer = asString(normalized.honest_disclaimer || 'Review carefully before publishing on LinkedIn.', 800)
  normalized.warning = asString(normalized.warning, 800)

  return normalized
}

async function optimizeWithAi(input) {
  const client = await getAnthropicClient()
  if (!client) {
    return buildLocalOptimization({
      ...input,
      warning: 'ANTHROPIC_API_KEY is not configured, so this is a local rule-based test result rather than an AI rewrite.'
    })
  }

  const prompt = `Analyze and optimize this LinkedIn profile.

TARGET ROLE/POSITIONING:
${input.targetRole || 'Not specified. Infer from existing content only.'}

ORIGINAL HEADLINE:
"${input.headline || '(empty)'}"

ORIGINAL ABOUT/SUMMARY:
"""
${input.about || '(empty)'}
"""

ORIGINAL EXPERIENCE:
"""
${input.experience || '(empty)'}
"""

SKILLS:
${input.skills || '(empty)'}

${langInstruction(input.lang)}

Return only valid JSON with this exact shape:
{
  "overall_score": 0,
  "score_explanation": "1-2 sentences",
  "headline": {
    "current_score": 0,
    "issues": ["specific issue"],
    "improved_version": "<=220 chars",
    "improved_score": 0,
    "why_better": "1-2 sentences"
  },
  "about": {
    "current_score": 0,
    "issues": ["specific issue"],
    "improved_version": "200-400 words when enough verified input exists; otherwise mark as missing and explain what verified content to add",
    "improved_score": 0,
    "why_better": "2 sentences"
  },
  "experience": {
    "current_score": 0,
    "issues": ["specific issue"],
    "improvements": [
      { "role_title": "job title from input", "improved_bullets": ["action verb + scope + verified result only"] }
    ],
    "general_advice": "1-2 sentences"
  },
  "skills": {
    "current_score": 0,
    "to_add": ["skill already supported by the input or target role"],
    "to_remove": ["skill that weakens positioning, if any"],
    "to_reorder_top_3": ["skill 1", "skill 2", "skill 3"],
    "rationale": "1 sentence"
  },
  "quick_wins": ["concrete 30-second action"],
  "honest_disclaimer": "short reminder"
}

Critical constraints:
- Do not invent facts, numbers, certifications, employers, responsibilities, or achievements.
- If a section is empty, do not pretend it exists; write that it must be added.
- Improved versions must be ready to copy only when enough factual input exists.
- Keep the LinkedIn headline under 220 characters.`

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 4200,
    temperature: 0.25,
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = message.content.map(block => block.text || '').join('').trim()
  return parseJsonFromAi(raw)
}

async function handlePdfExtract(req, res) {
  const body = parseBody(req)
  const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : ''
  const fileName = typeof body.fileName === 'string' ? body.fileName : 'linkedin-profile.pdf'
  if (!fileBase64) return res.status(400).json({ success: false, error: 'Missing PDF file.' })
  const normalized = fileBase64.includes(',') ? fileBase64.split(',').pop() : fileBase64
  const buffer = Buffer.from(normalized, 'base64')
  if (!buffer.length) return res.status(400).json({ success: false, error: 'Invalid PDF file.' })
  if (buffer.length > 5 * 1024 * 1024) return res.status(413).json({ success: false, error: 'PDF is too large. Please upload a file under 5 MB.' })
  try {
    const mod = await import('pdf-parse')
    const pdfParse = mod.default || mod
    const parsed = await pdfParse(buffer)
    const text = String(parsed.text || '').replace(/ /g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 12000)
    if (text.length < 50) return res.status(422).json({ success: false, error: 'Could not extract enough text from this PDF. Please use paste mode.' })
    return res.status(200).json({ success: true, fileName, text, chars: text.length })
  } catch (error) {
    console.error('LinkedIn PDF extract error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Could not extract text from PDF.' })
  }
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end?.()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (parseBody(req).type === 'extract-pdf') return handlePdfExtract(req, res)

  try {
    const body = parseBody(req)
    const lang = isAllowedLang(body.lang) ? body.lang : 'en'
    const profileUrl = asString(body.profileUrl, 500)
    const profileText = asString(body.profileText, MAX.fetchedProfile)
    const targetRole = asString(body.targetRole, MAX.targetRole)

    let headline = asString(body.headline, MAX.headline)
    let about = asString(body.about, MAX.about)
    let experience = asString(body.experience, MAX.experience)
    let skills = asString(body.skills, MAX.skills)
    let sourceUsed = 'paste'

    if (profileText) {
      const parsed = await parseProfileBlobWithAi(profileText, lang)
      headline = asString(parsed.headline || headline, MAX.headline)
      about = asString(parsed.about || about, MAX.about)
      experience = asString(parsed.experience || experience, MAX.experience)
      skills = asString(parsed.skills || skills, MAX.skills)
      sourceUsed = 'upload'
    } else if (profileUrl) {
      try {
        const blob = await fetchLinkedInProfile(profileUrl)
        const parsed = await parseProfileBlobWithAi(blob, lang)
        headline = asString(parsed.headline || headline, MAX.headline)
        about = asString(parsed.about || about, MAX.about)
        experience = asString(parsed.experience || experience, MAX.experience)
        skills = asString(parsed.skills || skills, MAX.skills)
        sourceUsed = 'url'
      } catch (error) {
        return res.status(200).json({
          success: false,
          fallback: 'paste',
          requiresPaste: true,
          error: error.message || 'Could not read this LinkedIn URL. Please paste your profile sections instead.'
        })
      }
    }

    if (headline.length < 5 && about.length < 30 && experience.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least a LinkedIn headline, About section, or experience content.'
      })
    }

    let optimization
    try {
      optimization = await optimizeWithAi({ headline, about, experience, skills, targetRole, lang })
    } catch (error) {
      console.error('AI optimization failed; returning local fallback:', error.message)
      optimization = buildLocalOptimization({
        headline,
        about,
        experience,
        skills,
        targetRole,
        lang,
        warning: `AI provider failed: ${error.message}. Returned local rule-based result so you can keep testing.`
      })
    }

    const normalized = normalizeResult(optimization, { headline, about, experience, skills })

    return res.status(200).json({
      success: true,
      sourceUsed,
      optimization: normalized
    })
  } catch (error) {
    console.error('LinkedIn optimize error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to optimize LinkedIn profile.'
    })
  }
}
