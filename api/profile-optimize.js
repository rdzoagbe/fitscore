import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient, requireUser, checkUsageLimit, recordUsageEvent, publicUsage } from './_lib/planGate.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a senior LinkedIn profile strategist and technical recruiter.
Your job is to improve a user's LinkedIn profile for their target role using ONLY the profile text provided by the user.
Do not invent employers, certifications, numbers, tools, titles, or achievements that are not supported by the text.
You may suggest placeholders like [number of users], [ticket volume], [team size] only when the user should add evidence.
Return ONLY valid JSON with this structure:
{
  "score": 0-100,
  "role_alignment": "one sentence",
  "current_positioning": "one sentence",
  "improved_headline": "copy-ready LinkedIn headline under 220 characters",
  "improved_about": "copy-ready About section, 120-180 words, first person, recruiter-friendly",
  "keyword_gaps": ["max 10 missing or underused recruiter keywords"],
  "experience_bullets": ["6 copy-ready bullet upgrades based only on supplied experience"],
  "priority_fixes": ["max 5 concrete fixes"],
  "search_keywords": ["max 12 keywords for LinkedIn search visibility"],
  "proof_needed": ["max 5 claims that need numbers/evidence"],
  "warnings": ["max 4 honest warnings about missing data or weak sections"]
}`

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function normalizeProfileUrl(value) {
  const raw = clean(value)
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^www\./i.test(raw)) return `https://${raw}`
  if (raw.includes('linkedin.com/')) return `https://${raw}`
  return raw
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createAdminClient()

  try {
    const user = await requireUser(req, supabase)
    const { profileText, targetRole, profileUrl } = req.body || {}
    const text = clean(profileText)
    const role = clean(targetRole) || 'the user target role'
    const url = normalizeProfileUrl(profileUrl)

    if (text.length < 120) {
      return res.status(400).json({
        error: 'Paste your LinkedIn headline, About section, Experience and Skills text to run AI profile optimization.',
        code: 'PROFILE_TEXT_REQUIRED',
        profileUrl: url || null,
        checklist: [
          'Paste your current headline.',
          'Paste your About section.',
          'Paste 2-3 Experience entries.',
          'Paste your Skills section or top tools.'
        ]
      })
    }

    const usage = await checkUsageLimit({ supabase, req, user, eventType: 'profile_optimize' })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2200,
      temperature: 0.2,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `TARGET ROLE:\n${role}\n\nLINKEDIN PROFILE URL REFERENCE:\n${url || 'Not provided'}\n\nPROFILE TEXT PROVIDED BY USER:\n${text.slice(0, 9000)}`
      }]
    })

    const raw = message.content.map(block => block.text || '').join('').trim().replace(/```json|```/g, '').trim()
    let result
    try {
      result = JSON.parse(raw)
    } catch (e) {
      console.error('Profile optimizer JSON parse failed:', raw.slice(0, 500))
      return res.status(500).json({ error: 'Profile optimization failed. Please try again.', code: 'BAD_AI_JSON' })
    }

    const safeArray = value => Array.isArray(value) ? value.map(clean).filter(Boolean) : []
    const score = Number.isFinite(Number(result.score)) ? Math.max(0, Math.min(100, Math.round(Number(result.score)))) : 0

    await recordUsageEvent({
      supabase,
      user,
      eventType: 'profile_optimize',
      usage,
      meta: { targetRole: role, profileUrl: url || null }
    })

    return res.status(200).json({
      success: true,
      usage: publicUsage(usage, 1),
      analysis: {
        score,
        role_alignment: clean(result.role_alignment),
        current_positioning: clean(result.current_positioning),
        improved_headline: clean(result.improved_headline),
        improved_about: clean(result.improved_about),
        keyword_gaps: safeArray(result.keyword_gaps).slice(0, 10),
        experience_bullets: safeArray(result.experience_bullets).slice(0, 8),
        priority_fixes: safeArray(result.priority_fixes).slice(0, 5),
        search_keywords: safeArray(result.search_keywords).slice(0, 12),
        proof_needed: safeArray(result.proof_needed).slice(0, 5),
        warnings: safeArray(result.warnings).slice(0, 4),
        profile_url: url || null,
        target_role: role
      }
    })
  } catch (e) {
    console.error('Profile optimizer error:', e.message)
    return res.status(e.statusCode || 500).json({
      error: e.message || 'Profile optimization failed',
      code: e.code || 'PROFILE_OPTIMIZE_FAILED',
      usage: e.usage || null
    })
  }
}