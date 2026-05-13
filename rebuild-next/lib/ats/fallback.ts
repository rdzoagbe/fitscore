import type { AtsRequest, AtsResult } from '@/lib/ats/schema'

const STOPWORDS = new Set([
  'the','and','for','with','you','your','are','this','that','from','have','has','will','our','their','dans','pour','avec','vous','nous','les','des','une','sur','est','aux','par','plus','être','qui','que','du','de','la','le','un','en','et','au'
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !STOPWORDS.has(token))
}

function countMap(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const token of tokens) map.set(token, (map.get(token) ?? 0) + 1)
  return map
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function weightFor(count: number): 'critical' | 'high' | 'medium' | 'low' {
  if (count >= 5) return 'critical'
  if (count >= 3) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

export function fallbackAtsAnalysis(request: AtsRequest): AtsResult {
  const cvTokens = tokenize(request.cvText)
  const jdTokens = tokenize(request.jobDescription)
  const cvMap = countMap(cvTokens)
  const jdMap = countMap(jdTokens)

  const rankedJdTerms = Array.from(jdMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 45)

  const matched = rankedJdTerms
    .filter(([keyword]) => cvMap.has(keyword))
    .slice(0, 18)
    .map(([keyword, jdCount]) => ({ keyword, cv_count: cvMap.get(keyword) ?? 0, jd_count: jdCount, weight: weightFor(jdCount) }))

  const missing = rankedJdTerms
    .filter(([keyword]) => !cvMap.has(keyword))
    .slice(0, 12)
    .map(([keyword, jdCount]) => ({ keyword, jd_count: jdCount, weight: weightFor(jdCount), suggestion: `Add relevant evidence for ${keyword} if it reflects your real experience.` }))

  const keywordScore = rankedJdTerms.length === 0 ? 0 : clamp((matched.length / Math.min(rankedJdTerms.length, 18)) * 100)
  const lengthScore = request.cvText.length > 1800 && request.cvText.length < 12000 ? 80 : request.cvText.length >= 800 ? 62 : 35
  const skillsScore = clamp(keywordScore * 0.75 + lengthScore * 0.25)
  const experienceScore = clamp(keywordScore * 0.6 + lengthScore * 0.4)
  const formatScore = request.cvText.includes('\t') ? 58 : 78
  const educationScore = /degree|master|bachelor|certification|certified|diplome|licence|formation/i.test(request.cvText) ? 75 : 50
  const overall = clamp(keywordScore * 0.38 + experienceScore * 0.25 + skillsScore * 0.18 + formatScore * 0.12 + educationScore * 0.07)

  return {
    overall_score: overall,
    scores: {
      keywords: keywordScore,
      experience: experienceScore,
      skills: skillsScore,
      format: formatScore,
      education: educationScore
    },
    matched_keywords: matched,
    missing_keywords: missing,
    recommendations: [
      {
        priority: missing.length > 5 ? 'critical' : 'medium',
        category: 'Keyword alignment',
        issue: missing.length > 0 ? 'Several job-description terms are not reflected in the CV.' : 'Core job-description terms are mostly reflected.',
        fix: missing.length > 0 ? 'Add truthful achievements using the missing terms where relevant.' : 'Keep the current alignment and strengthen measurable achievements.',
        before: null,
        after: null
      },
      {
        priority: formatScore < 70 ? 'medium' : 'good',
        category: 'ATS readability',
        issue: formatScore < 70 ? 'Formatting may reduce parser reliability.' : 'Formatting appears reasonably ATS-friendly.',
        fix: 'Prefer simple headings, bullet points, plain text skills and measurable results.',
        before: null,
        after: null
      }
    ],
    format_issues: formatScore < 70 ? ['Avoid tables, excessive columns or tab-based alignment.'] : [],
    estimated_ranking_percentile: overall,
    summary: overall >= 75 ? 'Strong match. Focus on precision and measurable evidence.' : overall >= 55 ? 'Moderate match. Improve keyword alignment and role-specific achievements.' : 'Weak match. Tailor the CV more closely before applying.'
  }
}
