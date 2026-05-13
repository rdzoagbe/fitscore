'use server'

import { revalidatePath } from 'next/cache'
import { requireUserSession } from '@/lib/auth/profile-session'
import { generateInterviewPrep } from '@/lib/interview/generate'
import type { InterviewPrepResult } from '@/lib/interview/schema'
import { createClient } from '@/lib/supabase/server'

export type InterviewPrepState = {
  readonly error?: string
  readonly warning?: string
  readonly result?: InterviewPrepResult
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function generateInterviewPrepAction(_prevState: InterviewPrepState, formData: FormData): Promise<InterviewPrepState> {
  const user = await requireUserSession()
  const cvVersionId = getString(formData, 'cvVersionId')
  const companyName = getString(formData, 'companyName')
  const jobTitle = getString(formData, 'jobTitle')
  const jobDescription = getString(formData, 'jobDescription')
  const language = getString(formData, 'language') === 'fr' ? 'fr' : 'en'
  const seniorityInput = getString(formData, 'seniority')
  const seniority = ['mid', 'senior', 'leadership', 'executive'].includes(seniorityInput) ? seniorityInput as 'mid' | 'senior' | 'leadership' | 'executive' : 'senior'

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

  const result = await generateInterviewPrep({ cvText: cv.parsed_text, companyName, jobTitle, jobDescription, language, seniority })

  const { data: application } = await supabase
    .from('applications')
    .insert({ user_id: user.id, company_name: companyName, job_title: jobTitle, job_description: jobDescription, status: 'screening' })
    .select('id')
    .single()

  const { error: insertError } = await supabase.from('interview_sessions').insert({
    user_id: user.id,
    application_id: application?.id ?? null,
    questions_json: result,
    confidence_score: result.confidence_score
  })

  revalidatePath('/interview')
  revalidatePath('/dashboard')

  if (insertError) return { result, warning: insertError.message }
  return { result }
}
