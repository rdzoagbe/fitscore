'use server'

import { revalidatePath } from 'next/cache'
import { generateCoverLetter } from '@/lib/cover-letter/generate'
import { renderCoverLetter, type CoverLetterResult } from '@/lib/cover-letter/schema'
import { requireUserSession } from '@/lib/auth/profile-session'
import { assertUsageAllowed } from '@/lib/billing/guards'
import { createClient } from '@/lib/supabase/server'

export type CoverLetterState = {
  readonly error?: string
  readonly warning?: string
  readonly result?: CoverLetterResult
  readonly content?: string
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function generateCoverLetterAction(_prevState: CoverLetterState, formData: FormData): Promise<CoverLetterState> {
  const user = await requireUserSession()
  const usage = await assertUsageAllowed(user.id, 'coverLetter')
  if (!usage.allowed) return { error: usage.message }

  const cvVersionId = getString(formData, 'cvVersionId')
  const companyName = getString(formData, 'companyName')
  const jobTitle = getString(formData, 'jobTitle')
  const jobDescription = getString(formData, 'jobDescription')
  const language = getString(formData, 'language') === 'fr' ? 'fr' : 'en'
  const toneInput = getString(formData, 'tone')
  const tone = ['professional', 'confident', 'warm', 'executive'].includes(toneInput) ? toneInput as 'professional' | 'confident' | 'warm' | 'executive' : 'professional'

  if (!cvVersionId) return { error: 'Choose a CV version first.' }
  if (!companyName) return { error: 'Company name is required.' }
  if (!jobTitle) return { error: 'Job title is required.' }
  if (jobDescription.length < 80) return { error: 'Paste a job description with at least 80 characters.' }

  const supabase = createClient()
  const { data: cv, error: cvError } = await supabase
    .from('cv_versions')
    .select('id,parsed_text')
    .eq('id', cvVersionId)
    .eq('user_id', user.id)
    .single()

  if (cvError || !cv?.parsed_text) return { error: 'CV version not found or not parsed.' }

  const result = await generateCoverLetter({ cvText: cv.parsed_text, companyName, jobTitle, jobDescription, language, tone })
  const content = renderCoverLetter(result)

  const { data: application } = await supabase
    .from('applications')
    .insert({ user_id: user.id, company_name: companyName, job_title: jobTitle, job_description: jobDescription, status: 'wishlist' })
    .select('id')
    .single()

  const { error: insertError } = await supabase.from('cover_letters').insert({
    user_id: user.id,
    application_id: application?.id ?? null,
    language,
    tone,
    content
  })

  revalidatePath('/cover-letters')
  revalidatePath('/dashboard')

  if (insertError) return { result, content, warning: insertError.message }
  return { result, content }
}
