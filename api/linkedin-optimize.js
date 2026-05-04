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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { headline, about, experience, skills, targetRole, lang = 'en' } = req.body

    // At least headline OR about must be filled
    if ((!headline || headline.trim().length < 5) && (!about || about.trim().length < 30)) {
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
"${(headline || '').trim() || '(empty)'}"

ORIGINAL ABOUT/SUMMARY:
"""
${(about || '').trim().slice(0, 3000) || '(empty)'}
"""

ORIGINAL EXPERIENCE (recent first, 1-3 entries):
"""
${(experience || '').trim().slice(0, 4000) || '(empty)'}
"""

SKILLS (current LinkedIn skill list, comma-separated):
${(skills || '').trim().slice(0, 1000) || '(empty)'}

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
    } catch (e) {
      console.error('Parse error:', e.message, 'Raw start:', raw.slice(0, 300))
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

    return res.status(200).json({ success: true, optimization: result })
  } catch (e) {
    console.error('LinkedIn optimize error:', e.message)
    return res.status(500).json({ error: e.message || 'Failed to optimize profile' })
  }
}
