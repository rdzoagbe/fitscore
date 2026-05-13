import { interviewPrepResultSchema, type InterviewPrepResult } from '@/lib/interview/schema'
import { createClient } from '@/lib/supabase/server'

export type InterviewSessionItem = {
  readonly id: string
  readonly createdAt: string
  readonly confidenceScore: number | null
  readonly result: InterviewPrepResult
  readonly companyName: string | null
  readonly jobTitle: string | null
}

type InterviewSessionRow = {
  id: string
  created_at: string
  confidence_score: number | null
  questions_json: unknown
  applications: {
    company_name: string
    job_title: string
  } | Array<{
    company_name: string
    job_title: string
  }> | null
}

function normalizeApplication(value: InterviewSessionRow['applications']): { company_name: string; job_title: string } | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getInterviewHistory(userId: string, limit = 8): Promise<InterviewSessionItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('id,created_at,confidence_score,questions_json,applications(company_name,job_title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load interview history', error.message)
    return []
  }

  return ((data ?? []) as unknown as InterviewSessionRow[])
    .map(row => {
      const parsed = interviewPrepResultSchema.safeParse(row.questions_json)
      const app = normalizeApplication(row.applications)
      if (!parsed.success) return null
      return {
        id: row.id,
        createdAt: row.created_at,
        confidenceScore: row.confidence_score,
        result: parsed.data,
        companyName: app?.company_name ?? null,
        jobTitle: app?.job_title ?? null
      }
    })
    .filter((item): item is InterviewSessionItem => item !== null)
}
