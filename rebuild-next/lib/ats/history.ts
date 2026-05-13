import { atsResultSchema, type AtsResult } from '@/lib/ats/schema'
import { createClient } from '@/lib/supabase/server'

export type AtsHistoryItem = {
  readonly id: string
  readonly overallScore: number | null
  readonly createdAt: string
  readonly result: AtsResult
  readonly cvVersion: {
    readonly id: string
    readonly name: string
    readonly fileName: string
    readonly targetRole: string | null
  } | null
}

type CvJoinRow = {
  id: string
  name: string
  file_name: string
  target_role: string | null
}

type AtsHistoryRow = {
  id: string
  overall_score: number | null
  created_at: string
  result_json: unknown
  cv_versions: CvJoinRow | CvJoinRow[] | null
}

function normalizeCvJoin(value: CvJoinRow | CvJoinRow[] | null): CvJoinRow | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getAtsHistory(userId: string, limit = 6): Promise<AtsHistoryItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ats_analyses')
    .select('id,overall_score,created_at,result_json,cv_versions(id,name,file_name,target_role)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load ATS history', error.message)
    return []
  }

  return ((data ?? []) as unknown as AtsHistoryRow[])
    .map(row => {
      const parsed = atsResultSchema.safeParse(row.result_json)
      const cvVersion = normalizeCvJoin(row.cv_versions)
      if (!parsed.success) return null
      return {
        id: row.id,
        overallScore: row.overall_score,
        createdAt: row.created_at,
        result: parsed.data,
        cvVersion: cvVersion ? {
          id: cvVersion.id,
          name: cvVersion.name,
          fileName: cvVersion.file_name,
          targetRole: cvVersion.target_role
        } : null
      }
    })
    .filter((item): item is AtsHistoryItem => item !== null)
}
