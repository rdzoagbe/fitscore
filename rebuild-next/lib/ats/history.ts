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

type AtsHistoryRow = {
  id: string
  overall_score: number | null
  created_at: string
  result_json: unknown
  cv_versions: {
    id: string
    name: string
    file_name: string
    target_role: string | null
  } | null
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

  return ((data ?? []) as AtsHistoryRow[])
    .map(row => {
      const parsed = atsResultSchema.safeParse(row.result_json)
      if (!parsed.success) return null
      return {
        id: row.id,
        overallScore: row.overall_score,
        createdAt: row.created_at,
        result: parsed.data,
        cvVersion: row.cv_versions ? {
          id: row.cv_versions.id,
          name: row.cv_versions.name,
          fileName: row.cv_versions.file_name,
          targetRole: row.cv_versions.target_role
        } : null
      }
    })
    .filter((item): item is AtsHistoryItem => item !== null)
}
