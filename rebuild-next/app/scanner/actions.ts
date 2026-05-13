'use server'

import { revalidatePath } from 'next/cache'
import { analyzeAts } from '@/lib/ats/analyze'
import { requireUserSession } from '@/lib/auth/profile-session'
import { createClient } from '@/lib/supabase/server'
import type { AtsResult } from '@/lib/ats/schema'

export type ScannerState = {
  readonly error?: string
  readonly warning?: string
  readonly result?: AtsResult
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function runScannerAction(_prevState: ScannerState, formData: FormData): Promise<ScannerState> {
  const user = await requireUserSession()
  const cvVersionId = getString(formData, 'cvVersionId')
  const jobDescription = getString(formData, 'jobDescription')
  const language = getString(formData, 'language') === 'fr' ? 'fr' : 'en'

  if (!cvVersionId) return { error: 'Choose a CV version first.' }
  if (jobDescription.length < 80) return { error: 'Paste a job description with at least 80 characters.' }

  const supabase = createClient()
  const { data: cv, error: cvError } = await supabase
    .from('cv_versions')
    .select('id,parsed_text')
    .eq('id', cvVersionId)
    .eq('user_id', user.id)
    .single()

  if (cvError || !cv?.parsed_text) return { error: 'CV version not found or not parsed.' }

  const result = await analyzeAts({ cvText: cv.parsed_text, jobDescription, language })

  const { error: insertError } = await supabase.from('ats_analyses').insert({
    user_id: user.id,
    cv_version_id: cvVersionId,
    result_json: result
  })

  revalidatePath('/scanner')
  revalidatePath('/dashboard')

  if (insertError) return { result, warning: insertError.message }

  return { result }
}
