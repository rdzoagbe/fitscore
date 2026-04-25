import { useState } from 'react'

const SYSTEM = `You are an expert ATS (Applicant Tracking System) analyzer and career coach.
Analyze the CV against the job offer and return ONLY a valid JSON object (no markdown, no backticks, no text outside JSON):
{
  "score": <integer 0-100>,
  "verdict": "<one punchy sentence verdict, max 12 words>",
  "categories": {
    "keywords": <0-100>,
    "skills": <0-100>,
    "experience": <0-100>,
    "education": <0-100>
  },
  "found_keywords": ["keyword1", ...],
  "missing_keywords": ["keyword1", ...],
  "advice": [
    {"type": "add", "text": "..."},
    {"type": "reword", "text": "..."},
    {"type": "remove", "text": "..."}
  ]
}
Rules:
- found_keywords: max 10 important keywords from the job offer found in the CV
- missing_keywords: max 8 critical keywords from job offer NOT in CV
- advice: exactly 5 specific actionable items (mix of add/reword/remove)
- type values: "add" | "reword" | "remove"
- Score 80+ = strong ATS match. Be honest and precise.`

export function useAnalyze() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  const analyze = async (jobText, cvText) => {
    setState({ status: 'loading', data: null, error: null })
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('API key not configured. Add VITE_ANTHROPIC_API_KEY to Railway environment variables.')

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM,
          messages: [{ role: 'user', content: `JOB OFFER:\n${jobText}\n\n---\n\nCV:\n${cvText}` }]
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || `API error ${res.status}`)
      }

      const data = await res.json()
      const raw = data.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(raw)
      setState({ status: 'done', data: parsed, error: null })
    } catch (e) {
      setState({ status: 'error', data: null, error: e.message })
    }
  }

  const reset = () => setState({ status: 'idle', data: null, error: null })

  return { ...state, analyze, reset }
}
