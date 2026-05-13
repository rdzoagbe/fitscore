import { createClient } from '@/lib/supabase/server'

export type CoverLetterItem = {
  readonly id: string
  readonly language: 'fr' | 'en'
  readonly content: string
  readonly tone: string
  readonly createdAt: string
  readonly companyName: string | null
  readonly jobTitle: string | null
}

type CoverLetterRow = {
  id: string
  language: 'fr' | 'en'
  content: string
  tone: string
  created_at: string
  applications: {
    company_name: string
    job_title: string
  } | Array<{
    company_name: string
    job_title: string
  }> | null
}

function normalizeApplication(value: CoverLetterRow['applications']): { company_name: string; job_title: string } | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export async function getCoverLetterHistory(userId: string, limit = 8): Promise<CoverLetterItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cover_letters')
    .select('id,language,content,tone,created_at,applications(company_name,job_title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to load cover letter history', error.message)
    return []
  }

  return ((data ?? []) as unknown as CoverLetterRow[]).map(row => {
    const app = normalizeApplication(row.applications)
    return {
      id: row.id,
      language: row.language,
      content: row.content,
      tone: row.tone,
      createdAt: row.created_at,
      companyName: app?.company_name ?? null,
      jobTitle: app?.job_title ?? null
    }
  })
}
