import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a LinkedIn profile optimization expert with 10+ years coaching senior professionals. You analyze profiles for:
- Recruiter-friendliness (keyword density, scannability)
- Personal brand clarity (clear positioning, target role alignment)
- Engagement quality (hooks, results-oriented language, social proof)
- ATS-readability (LinkedIn's internal search uses keywords too)

You give SPECIFIC, COPY-PASTE-READY rewrites. Never generic advice.
You NEVER fabricate experience, certifications, or achievements that aren't in the original.
You optimize WORDING and STRUCTURE only — the truth must remain.`

// Try to fetch a public LinkedIn profile from URL.
// LinkedIn aggressively blocks automated requests; this will usually return 403.
// We attempt anyway and fall back to paste mode on failure.
async function fetchLinkedInProfile(url) {
  let res
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      },
      redirect: 'follow'
    })
  } catch (fetchErr) {
    throw new Error('Could not reach LinkedIn. Please paste your profile sections below instead.')
  }

  if (!res.ok) {
    throw new Error('LinkedIn blocks automated profile reading. Please paste your profile sections below instead.')
  }

  const html = await res.text()

  // Strip scripts/styles, then HTML tags
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ').trim()

  // LinkedIn authwall returns ~few hundred chars of "Sign in / Join" boilerplate
  // Real profile content is usually 3000+ chars
  if (text.length < 800) {
    throw new Error('LinkedIn returned a login wall, not your profile. Please paste your profile sections below instead.')
  }

  // Sanity: must contain at least basic profile signals
  const lower = text.toLowerCase()
  if (!lower.includes('experience') && !lower.includes('about') && !lower.includes('skill')) {
    throw new Error('Could not extract profile content from this URL. Please paste your profile sections below instead.')
  }

  return text.slice(0, 8000)
}

// Use AI to parse a single big text blob into headline/about/experience/skills
async function parseProfileBlob(blob, lang) {
  const langInstr = {
    en: 'in English', fr: 'in French', es: 'in Spanish',
    de: 'in German', it: 'in Italian', pt: 'in Portuguese'
  }[lang] || 'in English'

  const prompt = `Below is raw text from a LinkedIn profile (either pasted as one blob or fetched from a URL). Extract the 4 main sections.

Return ONLY this JSON, no markdown:
{
  "headline": "<short professional title line, ≤220 chars>",
  "about": "<the About / Summary section, full text>",
  "experience": "<recent 2-3 experience entries: title + company + bullets>",
  "skills": "<comma-separated list of skills found, max 30>"
}

If a section is genuinely missing from the input, return empty string for that field. Don't fabricate.

Output language: keep original ${langInstr}.

RAW TEXT:
"""
${blob.slice(0, 7500)}
"""`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(raw)
  } catch (e) {
    return { headline: '', about: blob.slice(0, 3000), experience: '', skills: '' }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { profileUrl, headline, about, experience, skills, targetRole, lang = 'en' } = req.body

    let h = headline || ''
    let a = about || ''
    let e = experience || ''
    let s = skills || ''

    // Path 1: URL provided — try to fetch
    if (profileUrl && profileUrl.trim()) {
      const url = profileUrl.trim()
      if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/pub/')) {
        return res.status(400).json({ error: 'Please provide a LinkedIn profile URL (e.g. https://www.linkedin.com/in/yourname).' })
      }

      try {
        const blob = await fetchLinkedInProfile(url)
        const parsed = await parseProfileBlob(blob, lang)
        h = parsed.headline || h
        a = parsed.about || a
        e = parsed.experience || e
        s = parsed.skills || s
      } catch (fetchErr) {
        // Throw the friendly fallback message — frontend will switch to paste mode
        return res.status(502).json({
          error: fetchErr.message || 'Could not fetch LinkedIn profile. Please paste your sections instead.',
          fallback: 'paste'
        })
      }
    }

    // Path 2 (or fallback after URL parse): use whatever we have
    if ((!h || h.trim().length < 5) && (!a || a.trim().length < 30)) {
      return res.status(400).json({ error: 'Please paste at least your Headline or About section to analyze.' })
    }

    const langMap = {
      en: 'Write all output in English.',
      fr: 'Rédige toutes les sorties en français.',
      es: 'Escribe toda la salida en español.',
      de: 'Schreibe alle Ausgaben auf Deutsch.',
      it: 'Scrivi tutto l\'output in italiano.',
      pt: 'Escreve todo o output em português.'
    }

    const prompt = `Analyze and optimize this LinkedIn profile.

TARGET ROLE/POSITIONING (what the user wants to be found for):
${targetRole?.trim() || 'Not specified — infer from existing content'}

ORIGINAL HEADLINE (max 220 chars on LinkedIn):
"${(h || '').trim() || '(empty)'}"

ORIGINAL ABOUT/SUMMARY:
"""
${(a || '').trim().slice(0, 3000) || '(empty)'}
"""

ORIGINAL EXPERIENCE (recent first, 1-3 entries):
"""
${(e || '').trim().slice(0, 4000) || '(empty)'}
"""

SKILLS (current LinkedIn skill list, comma-separated):
${(s || '').trim().slice(0, 1000) || '(empty)'}

${langMap[lang] || langMap.en}

Return ONLY this JSON, no markdown, no preamble:
{
  "overall_score": <0-100 integer based on profile completeness, keyword density, clarity, and recruiter appeal>,
  "score_explanation": "<1-2 sentences explaining what drives the score>",

  "headline": {
    "current_score": <0-10 integer>,
    "issues": ["<specific issue 1>", "<issue 2>", "<issue 3 max>"],
    "improved_version": "<rewritten headline, ≤220 chars, keyword-rich, role-clear, recruiter-magnet>",
    "improved_score": <projected 0-10 score after improvement>,
    "why_better": "<1-2 sentences explaining what changed and why>"
  },

  "about": {
    "current_score": <0-10 integer>,
    "issues": ["<issue 1>", "<issue 2>", "<issue 3 max>"],
    "improved_version": "<full rewritten About section. 200-400 words. First-person. Hook in line 1. Specific achievements. Clear CTA at the end. Use line breaks for scannability.>",
    "improved_score": <projected 0-10 after improvement>,
    "why_better": "<2 sentences explaining the structural changes>"
  },

  "experience": {
    "current_score": <0-10>,
    "issues": ["<common issue across experience entries>", "<issue 2>"],
    "improvements": [
      {
        "role_title": "<job title from input>",
        "improved_bullets": [
          "<rewritten bullet 1 — action verb + what + measurable result>",
          "<bullet 2>",
          "<bullet 3 max — keep most relevant only>"
        ]
      }
    ],
    "general_advice": "<1-2 sentences on how to write LinkedIn experience entries vs CV entries>"
  },

  "skills": {
    "current_score": <0-10>,
    "to_add": ["<skill 1 to add>", "<skill 2>", "<skill 3 max>"],
    "to_remove": ["<skill that hurts positioning>", "..."],
    "to_reorder_top_3": ["<top 3 skills user should pin>", "<skill 2>", "<skill 3>"],
    "rationale": "<1 sentence on why these changes>"
  },

  "quick_wins": [
    "<concrete 30-second action 1, e.g. 'Add a profile photo with neutral background'>",
    "<action 2>",
    "<action 3>",
    "<action 4 max — only include high-impact, low-effort items>"
  ],

  "honest_disclaimer": "<short reminder to verify and edit before publishing>"
}

CRITICAL RULES:
- NEVER invent skills, jobs, certifications, achievements not present in the original input
- If a section was empty, suggest what to write but mark it clearly as "Add this" rather than "Improve this"
- All improved versions must be COPY-PASTE READY (no placeholders like [Your Name])
- Be specific to the target role if provided — don't write generic content
- Issues should be diagnostic, not just "this is weak" — explain what's wrong concretely`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4500,
      temperature: 0.3,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()

    let result
    try {
      result = JSON.parse(raw)
    } catch (parseErr) {
      console.error('Parse error:', parseErr.message, 'Raw start:', raw.slice(0, 300))
      return res.status(500).json({ error: 'Could not parse AI response. Please try again.' })
    }

    // Defensive normalization
    const safeNum = (v, fallback = 0) => {
      const n = typeof v === 'number' ? v : parseInt(v, 10)
      return isNaN(n) ? fallback : Math.max(0, Math.min(100, n))
    }
    const safe10 = (v) => Math.max(0, Math.min(10, safeNum(v, 0)))

    result.overall_score = safeNum(result.overall_score, 0)
    result.headline = result.headline || {}
    result.headline.current_score = safe10(result.headline.current_score)
    result.headline.improved_score = safe10(result.headline.improved_score)
    result.headline.issues = Array.isArray(result.headline.issues) ? result.headline.issues.slice(0, 3) : []

    result.about = result.about || {}
    result.about.current_score = safe10(result.about.current_score)
    result.about.improved_score = safe10(result.about.improved_score)
    result.about.issues = Array.isArray(result.about.issues) ? result.about.issues.slice(0, 3) : []

    result.experience = result.experience || {}
    result.experience.current_score = safe10(result.experience.current_score)
    result.experience.issues = Array.isArray(result.experience.issues) ? result.experience.issues.slice(0, 3) : []
    result.experience.improvements = Array.isArray(result.experience.improvements) ? result.experience.improvements : []

    result.skills = result.skills || {}
    result.skills.current_score = safe10(result.skills.current_score)
    result.skills.to_add = Array.isArray(result.skills.to_add) ? result.skills.to_add.slice(0, 5) : []
    result.skills.to_remove = Array.isArray(result.skills.to_remove) ? result.skills.to_remove.slice(0, 5) : []
    result.skills.to_reorder_top_3 = Array.isArray(result.skills.to_reorder_top_3) ? result.skills.to_reorder_top_3.slice(0, 3) : []

    result.quick_wins = Array.isArray(result.quick_wins) ? result.quick_wins.slice(0, 4) : []
    result.honest_disclaimer = result.honest_disclaimer || 'Review carefully before publishing on LinkedIn.'

    return res.status(200).json({ success: true, optimization: result, sourceUsed: profileUrl ? 'url' : 'paste' })
  } catch (e) {
    console.error('LinkedIn optimize error:', e.message)
    return res.status(500).json({ error: e.message || 'Failed to optimize profile' })
  }
}
