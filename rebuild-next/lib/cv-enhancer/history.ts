import { createClient } from '@/lib/supabase/server'

export type CvEnhancementItem = {
  readonly id: string
  readonly name: string
  readonly fileName: string
  readonly targetRole: string | null
  readonly parsedText: string | null
  readonly atsScore: number | null
  readonly createdAt: string
}

export async function getEnhancedCvVersions(userId: string, limit = 8): Promise<CvEnhancementItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cv_versions')
    .select('id,name,file_name,target_role,parsed_text,ats_score,created_at')
    .eq('user_id', userId)
    .ilike('name', 'Enhanced:%')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load enhanced CV versions', error.message)
    return []
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    fileName: row.file_name,
    targetRole: row.target_role,
    parsedText: row.parsed_text,
    atsScore: row.ats_score,
    createdAt: row.created_at
  }))
}
