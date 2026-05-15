'use server'

import { revalidatePath } from 'next/cache'
import { analyzeAts } from '@/lib/ats/analyze'
import { requireUserSession } from '@/lib/auth/profile-session'
import { assertUsageAllowed } from '@/lib/billing/guards'
import { createClient } from '@/lib/supabase/server'
import type { AtsResult } from '@/lib/ats/schema'

export async function deleteCvAction(cvVersionId: string): Promise<{ error?: string }> {
  const user = await requireUserSession()
  const supabase = createClient()

  const { data: cv } = await supabase
    .from('cv_versions')
    .select('file_url')
    .eq('id', cvVersionId)
    .eq('user_id', user.id)
    .single()

  if (!cv) return { error: 'CV not found.' }

  if (cv.file_url) {
    await supabase.storage.from('cv-files').remove([cv.file_url as string])
  }

  const { error } = await supabase.from('cv_versions').delete().eq('id', cvVersionId).eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/scanner')
  revalidatePath('/cv-enhancer')
  return {}
}

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
  const usage = await assertUsageAllowed(user.id, 'atsScan')
  if (!usage.allowed) return { error: usage.message }

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
