import type { ApplicationStatus } from '@/lib/tracker/schema'
import { kanbanStatuses } from '@/lib/tracker/schema'
import { createClient } from '@/lib/supabase/server'

export type ApplicationItem = {
  readonly id: string
  readonly companyName: string
  readonly jobTitle: string
  readonly jobUrl: string | null
  readonly jobDescription: string | null
  readonly status: ApplicationStatus
  readonly platform: string | null
  readonly atsScore: number | null
  readonly appliedAt: string | null
  readonly interviewAt: string | null
  readonly createdAt: string
}

export type TrackerStats = {
  readonly total: number
  readonly active: number
  readonly interviews: number
  readonly offers: number
  readonly rejected: number
  readonly noResponse: number
}

type ApplicationRow = {
  id: string
  company_name: string
  job_title: string
  job_url: string | null
  job_description: string | null
  status: ApplicationStatus
  platform: string | null
  ats_score: number | null
  applied_at: string | null
  interview_at: string | null
  created_at: string
}

function toItem(row: ApplicationRow): ApplicationItem {
  return {
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    jobUrl: row.job_url,
    jobDescription: row.job_description,
    status: row.status,
    platform: row.platform,
    atsScore: row.ats_score,
    appliedAt: row.applied_at,
    interviewAt: row.interview_at,
    createdAt: row.created_at
  }
}

export async function getApplications(userId: string, limit = 100): Promise<ApplicationItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('id,company_name,job_title,job_url,job_description,status,platform,ats_score,applied_at,interview_at,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load applications', error.message)
    return []
  }

  return ((data ?? []) as ApplicationRow[]).map(toItem)
}

export function groupApplicationsByStatus(items: ApplicationItem[]): Record<ApplicationStatus, ApplicationItem[]> {
  const grouped = Object.fromEntries(kanbanStatuses.map(status => [status, []])) as Record<ApplicationStatus, ApplicationItem[]>
  for (const item of items) {
    const status = kanbanStatuses.includes(item.status) ? item.status : 'wishlist'
    grouped[status].push(item)
  }
  return grouped
}

export function getTrackerStats(items: ApplicationItem[]): TrackerStats {
  return {
    total: items.length,
    active: items.filter(item => !['accepted', 'rejected', 'withdrawn'].includes(item.status)).length,
    interviews: items.filter(item => ['interview_1', 'interview_2', 'technical_test'].includes(item.status)).length,
    offers: items.filter(item => ['offer', 'accepted'].includes(item.status)).length,
    rejected: items.filter(item => item.status === 'rejected').length,
    noResponse: items.filter(item => item.status === 'no_response').length
  }
}
