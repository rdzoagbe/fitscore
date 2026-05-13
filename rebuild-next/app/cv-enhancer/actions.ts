'use server'

import { revalidatePath } from 'next/cache'
import { requireUserSession } from '@/lib/auth/profile-session'
import { assertUsageAllowed } from '@/lib/billing/guards'
import { parseCvFile, isAllowedCvFile } from '@/lib/cv/parse'
import { createClient } from '@/lib/supabase/server'

export type CvUploadState = {
  readonly error?: string
  readonly message?: string
}

const MAX_FILE_SIZE = 8 * 1024 * 1024

function getFile(formData: FormData): File | null {
  const value = formData.get('cvFile')
  return value instanceof File && value.size > 0 ? value : null
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function uploadCvAction(_prevState: CvUploadState, formData: FormData): Promise<CvUploadState> {
  const user = await requireUserSession()
  const usage = await assertUsageAllowed(user.id, 'cvUpload')
  if (!usage.allowed) return { error: usage.message }

  const file = getFile(formData)
  const label = getString(formData, 'label') || 'Base CV'
  const targetRole = getString(formData, 'targetRole') || null

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

  revalidatePath('/cv-enhancer')
  return { message: 'CV uploaded and parsed successfully.' }
}
