import { atsResultSchema } from '@/lib/ats/schema'
import { createClient } from '@/lib/supabase/server'

type KeywordWeight = 'critical' | 'high' | 'medium' | 'low'

export type KeywordMetric = {
  readonly keyword: string
  readonly count: number
  readonly scans: number
  readonly weight: KeywordWeight
  readonly coverage: number
}

export type KeywordIntelligence = {
  readonly totalScans: number
  readonly matchedTotal: number
  readonly missingTotal: number
  readonly criticalGaps: number
  readonly coverageScore: number
  readonly matchedKeywords: KeywordMetric[]
  readonly missingKeywords: KeywordMetric[]
  readonly recommendations: Array<{
    readonly title: string
    readonly detail: string
    readonly priority: 'critical' | 'medium' | 'good'
  }>
}

type AtsAnalysisRow = {
  result_json: unknown
}

const weightRank: Record<KeywordWeight, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

function betterWeight(current: KeywordWeight | undefined, next: KeywordWeight): KeywordWeight {
  if (!current) return next
  return weightRank[next] > weightRank[current] ? next : current
}

function increment(map: Map<string, { count: number; scans: Set<number>; weight: KeywordWeight }>, keyword: string, amount: number, scanIndex: number, weight: KeywordWeight): void {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return
  const existing = map.get(normalized)
  if (!existing) {
    map.set(normalized, { count: amount, scans: new Set([scanIndex]), weight })
    return
  }
  existing.count += amount
  existing.scans.add(scanIndex)
  existing.weight = betterWeight(existing.weight, weight)
}

function toMetrics(map: Map<string, { count: number; scans: Set<number>; weight: KeywordWeight }>, totalScans: number): KeywordMetric[] {
  return Array.from(map.entries())
    .map(([keyword, value]) => ({
      keyword,
      count: value.count,
      scans: value.scans.size,
      weight: value.weight,
      coverage: totalScans === 0 ? 0 : Math.round((value.scans.size / totalScans) * 100)
    }))
    .sort((a, b) => weightRank[b.weight] - weightRank[a.weight] || b.scans - a.scans || b.count - a.count)
}

export async function getKeywordIntelligence(userId: string, limit = 40): Promise<KeywordIntelligence> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ats_analyses')
    .select('result_json')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load keyword intelligence', error.message)
    return emptyKeywordIntelligence()
  }

  const rows = (data ?? []) as AtsAnalysisRow[]
  const matched = new Map<string, { count: number; scans: Set<number>; weight: KeywordWeight }>()
  const missing = new Map<string, { count: number; scans: Set<number>; weight: KeywordWeight }>()
  let validScans = 0

  rows.forEach((row, index) => {
    const parsed = atsResultSchema.safeParse(row.result_json)
    if (!parsed.success) return
    validScans += 1

    parsed.data.matched_keywords.forEach(item => {
      increment(matched, item.keyword, item.jd_count || 1, index, item.weight)
    })

    parsed.data.missing_keywords.forEach(item => {
      increment(missing, item.keyword, item.jd_count || 1, index, item.weight)
    })
  })

  const matchedKeywords = toMetrics(matched, validScans).slice(0, 30)
  const missingKeywords = toMetrics(missing, validScans).slice(0, 30)
  const criticalGaps = missingKeywords.filter(item => item.weight === 'critical' || item.weight === 'high').length
  const matchedTotal = matchedKeywords.reduce((sum, item) => sum + item.count, 0)
  const missingTotal = missingKeywords.reduce((sum, item) => sum + item.count, 0)
  const coverageScore = matchedTotal + missingTotal === 0 ? 0 : Math.round((matchedTotal / (matchedTotal + missingTotal)) * 100)

  return {
    totalScans: validScans,
    matchedTotal,
    missingTotal,
    criticalGaps,
    coverageScore,
    matchedKeywords,
    missingKeywords,
    recommendations: buildRecommendations({ validScans, coverageScore, missingKeywords })
  }
}

function buildRecommendations(input: { validScans: number; coverageScore: number; missingKeywords: KeywordMetric[] }): KeywordIntelligence['recommendations'] {
  if (input.validScans === 0) {
    return [{ title: 'Run your first ATS scan', detail: 'Keyword intelligence appears after you scan at least one job description.', priority: 'medium' }]
  }

  const topGap = input.missingKeywords[0]
  const recommendations: KeywordIntelligence['recommendations'] = []

  if (topGap) {
    recommendations.push({
      title: `Close the ${topGap.keyword} gap`,
      detail: `This keyword appears as a ${topGap.weight} gap across ${topGap.scans} scan(s). Add it only if it reflects your real experience.`,
      priority: topGap.weight === 'critical' || topGap.weight === 'high' ? 'critical' : 'medium'
    })
  }

  if (input.coverageScore < 60) {
    recommendations.push({ title: 'Improve CV-job alignment', detail: 'Your recent scans show more missing than matched keyword signals. Tailor the CV summary and skills section before applying.', priority: 'critical' })
  } else if (input.coverageScore < 75) {
    recommendations.push({ title: 'Strengthen role-specific wording', detail: 'Your CV is moderately aligned. Add measurable examples around the highest-frequency missing terms.', priority: 'medium' })
  } else {
    recommendations.push({ title: 'Maintain keyword discipline', detail: 'Your recent scans show good coverage. Focus on measurable proof rather than adding more buzzwords.', priority: 'good' })
  }

  return recommendations
}

function emptyKeywordIntelligence(): KeywordIntelligence {
  return {
    totalScans: 0,
    matchedTotal: 0,
    missingTotal: 0,
    criticalGaps: 0,
    coverageScore: 0,
    matchedKeywords: [],
    missingKeywords: [],
    recommendations: [{ title: 'No keyword data yet', detail: 'Run ATS scans to build keyword intelligence.', priority: 'medium' }]
  }
}
