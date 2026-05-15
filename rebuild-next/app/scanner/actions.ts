'use server'

import { revalidatePath } from 'next/cache'
import { analyzeAts } from '@/lib/ats/analyze'
import { requireUserSession } from '@/lib/auth/profile-session'
import { assertUsageAllowed } from '@/lib/billing/guards'
import { parseCvFile, isAllowedCvFile } from '@/lib/cv/parse'
import { createClient } from '@/lib/supabase/server'
import type { AtsResult } from '@/lib/ats/schema'

export type CvUploadState = {
  readonly error?: string
  readonly message?: string
}

const MAX_FILE_SIZE = 8 * 1024 * 1024

export async function uploadCvAction(_prevState: CvUploadState, formData: FormData): Promise<CvUploadState> {
  const user = await requireUserSession()
  const usage = await assertUsageAllowed(user.id, 'cvUpload')
  if (!usage.allowed) return { error: usage.message }

  const value = formData.get('cvFile')
  const file = value instanceof File && value.size > 0 ? value : null
  const label = (typeof formData.get('label') === 'string' ? (formData.get('label') as string).trim() : '') || 'Base CV'
  const targetRole = typeof formData.get('targetRole') === 'string' ? (formData.get('targetRole') as string).trim() || null : null

  if (!file) return { error: 'Choose a CV file to upload.' }
  if (!isAllowedCvFile(file)) return { error: 'Upload a PDF, DOCX or TXT file.' }
  if (file.size > MAX_FILE_SIZE) return { error: 'File is too large. Maximum size is 8 MB.' }

  const supabase = createClient()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90)
  const storagePath = `${user.id}/${Date.now()}-${safeName}`

  const parsedText = await parseCvFile(file)
  if (parsedText.length < 50) return { error: 'The CV text could not be extracted. Try another PDF/DOCX or upload TXT.' }

  const { error: uploadError } = await supabase.storage
    .from('cv-files')
    .upload(storagePath, file, { contentType: file.type || `application/${extension}`, upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { error: insertError } = await supabase.from('cv_versions').insert({
    user_id: user.id,
    name: label,
    file_url: storagePath,
    file_name: file.name,
    parsed_text: parsedText,
    is_base: true,
    target_role: targetRole
  })

  if (insertError) return { error: insertError.message }

  revalidatePath('/scanner')
  revalidatePath('/cv-enhancer')
  return { message: 'CV uploaded and parsed successfully.' }
}

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
    overall_score: result.overall_score,
    result_json: result
  })

  revalidatePath('/scanner')
  revalidatePath('/dashboard')

  if (insertError) return { result, warning: insertError.message }

  return { result }
}
