import { getPlan, type PlanDefinition } from '@/lib/billing/plans'
import { createClient } from '@/lib/supabase/server'

export type UsageSnapshot = {
  readonly plan: PlanDefinition
  readonly counts: {
    readonly atsScans: number
    readonly cvVersions: number
    readonly coverLetters: number
    readonly interviewPreps: number
    readonly applications: number
    readonly iprExports: number
  }
  readonly canUse: {
    readonly atsScan: boolean
    readonly cvUpload: boolean
    readonly coverLetter: boolean
    readonly interviewPrep: boolean
    readonly applicationTracking: boolean
    readonly iprExport: boolean
  }
}

function monthStartIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

async function countRows(table: string, userId: string, since?: string): Promise<number> {
  const supabase = createClient()
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (since) query = query.gte('created_at', since)
  const { count, error } = await query
  if (error) {
    console.error(`Failed to count ${table}`, error.message)
    return 0
  }
  return count ?? 0
}

export async function getUsageSnapshot(userId: string, planId?: string | null): Promise<UsageSnapshot> {
  const plan = getPlan(planId)
  const since = monthStartIso()

  const [atsScans, cvVersions, coverLetters, interviewPreps, applications] = await Promise.all([
    countRows('ats_analyses', userId, since),
    countRows('cv_versions', userId),
    countRows('cover_letters', userId, since),
    countRows('interview_sessions', userId, since),
    countRows('applications', userId)
  ])

  const iprExports = 0

  return {
    plan,
    counts: { atsScans, cvVersions, coverLetters, interviewPreps, applications, iprExports },
    canUse: {
      atsScan: atsScans < plan.limits.atsScansPerMonth,
      cvUpload: cvVersions < plan.limits.cvUploads,
      coverLetter: coverLetters < plan.limits.coverLettersPerMonth,
      interviewPrep: interviewPreps < plan.limits.interviewPrepsPerMonth,
      applicationTracking: applications < plan.limits.trackedApplications,
      iprExport: iprExports < plan.limits.iprExportsPerMonth
    }
  }
}
