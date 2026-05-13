import type { ApplicationItem } from '@/lib/tracker/data'

export type PlatformMetric = {
  readonly platform: string
  readonly total: number
  readonly responses: number
  readonly interviews: number
  readonly offers: number
  readonly responseRate: number
  readonly interviewRate: number
  readonly offerRate: number
}

export type WeeklyMetric = {
  readonly label: string
  readonly total: number
}

export type TrackerAnalytics = {
  readonly total: number
  readonly responses: number
  readonly interviews: number
  readonly offers: number
  readonly rejected: number
  readonly responseRate: number
  readonly interviewRate: number
  readonly offerRate: number
  readonly rejectionRate: number
  readonly topPlatform: PlatformMetric | null
  readonly platformMetrics: PlatformMetric[]
  readonly weeklyMetrics: WeeklyMetric[]
  readonly insights: Array<{
    readonly title: string
    readonly detail: string
    readonly tone: 'good' | 'warning' | 'critical'
  }>
}

const responseStatuses = new Set(['screening', 'interview_1', 'interview_2', 'technical_test', 'offer', 'accepted', 'rejected'])
const interviewStatuses = new Set(['interview_1', 'interview_2', 'technical_test', 'offer', 'accepted'])
const offerStatuses = new Set(['offer', 'accepted'])

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100)
}

function weekLabel(date: Date): string {
  const first = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - first.getTime()) / 86400000)
  const week = Math.ceil((days + first.getDay() + 1) / 7)
  return `W${String(week).padStart(2, '0')}`
}

function getItemDate(item: ApplicationItem): Date {
  return new Date(item.appliedAt ?? item.createdAt)
}

export function buildTrackerAnalytics(items: ApplicationItem[]): TrackerAnalytics {
  const total = items.length
  const responses = items.filter(item => responseStatuses.has(item.status)).length
  const interviews = items.filter(item => interviewStatuses.has(item.status)).length
  const offers = items.filter(item => offerStatuses.has(item.status)).length
  const rejected = items.filter(item => item.status === 'rejected').length

  const platformMetrics = buildPlatformMetrics(items)
  const topPlatform = platformMetrics[0] ?? null
  const weeklyMetrics = buildWeeklyMetrics(items)

  const responseRate = percent(responses, total)
  const interviewRate = percent(interviews, total)
  const offerRate = percent(offers, total)
  const rejectionRate = percent(rejected, total)

  return {
    total,
    responses,
    interviews,
    offers,
    rejected,
    responseRate,
    interviewRate,
    offerRate,
    rejectionRate,
    topPlatform,
    platformMetrics,
    weeklyMetrics,
    insights: buildInsights({ total, responseRate, interviewRate, offerRate, topPlatform })
  }
}

function buildPlatformMetrics(items: ApplicationItem[]): PlatformMetric[] {
  const buckets = new Map<string, ApplicationItem[]>()

  for (const item of items) {
    const platform = item.platform?.trim() || 'Unknown'
    const existing = buckets.get(platform) ?? []
    existing.push(item)
    buckets.set(platform, existing)
  }

  return Array.from(buckets.entries())
    .map(([platform, platformItems]) => {
      const total = platformItems.length
      const responses = platformItems.filter(item => responseStatuses.has(item.status)).length
      const interviews = platformItems.filter(item => interviewStatuses.has(item.status)).length
      const offers = platformItems.filter(item => offerStatuses.has(item.status)).length

      return {
        platform,
        total,
        responses,
        interviews,
        offers,
        responseRate: percent(responses, total),
        interviewRate: percent(interviews, total),
        offerRate: percent(offers, total)
      }
    })
    .sort((a, b) => b.responseRate - a.responseRate || b.total - a.total)
}

function buildWeeklyMetrics(items: ApplicationItem[]): WeeklyMetric[] {
  const sorted = [...items].sort((a, b) => getItemDate(a).getTime() - getItemDate(b).getTime())
  const buckets = new Map<string, number>()

  for (const item of sorted) {
    const date = getItemDate(item)
    const label = `${date.getFullYear()} ${weekLabel(date)}`
    buckets.set(label, (buckets.get(label) ?? 0) + 1)
  }

  return Array.from(buckets.entries())
    .slice(-16)
    .map(([label, total]) => ({ label, total }))
}

function buildInsights(input: { total: number; responseRate: number; interviewRate: number; offerRate: number; topPlatform: PlatformMetric | null }): TrackerAnalytics['insights'] {
  const insights: TrackerAnalytics['insights'] = []

  if (input.total === 0) {
    return [{ title: 'Start tracking applications', detail: 'Add applications to build conversion and platform performance analytics.', tone: 'warning' }]
  }

  if (input.responseRate < 15) {
    insights.push({ title: 'Response rate is low', detail: 'Improve targeting, ATS score and recruiter-facing CV alignment before increasing volume.', tone: 'critical' })
  } else if (input.responseRate < 30) {
    insights.push({ title: 'Response rate is moderate', detail: 'Focus on applications where your CV reaches a stronger keyword match.', tone: 'warning' })
  } else {
    insights.push({ title: 'Response rate is healthy', detail: 'Your targeting appears effective. Prioritize interview preparation and follow-up discipline.', tone: 'good' })
  }

  if (input.interviewRate < 10) {
    insights.push({ title: 'Interview conversion needs work', detail: 'Strengthen cover letters, LinkedIn positioning and role-specific achievements.', tone: 'warning' })
  } else {
    insights.push({ title: 'Interview conversion is active', detail: 'Keep a prepared STAR library and salary positioning ready.', tone: 'good' })
  }

  if (input.topPlatform) {
    insights.push({ title: `${input.topPlatform.platform} performs best`, detail: `This platform has a ${input.topPlatform.responseRate}% response rate across ${input.topPlatform.total} tracked application(s).`, tone: 'good' })
  }

  if (input.offerRate === 0 && input.total >= 10) {
    insights.push({ title: 'No offer signal yet', detail: 'Review interview feedback patterns and target roles where your experience is clearly differentiated.', tone: 'warning' })
  }

  return insights
}
