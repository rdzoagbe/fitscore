'use server'

import { revalidatePath } from 'next/cache'
import { requireUserSession } from '@/lib/auth/profile-session'
import { assertUsageAllowed } from '@/lib/billing/guards'
import { generateCvEnhancement } from '@/lib/cv-enhancer/generate'
import type { CvEnhancerResult } from '@/lib/cv-enhancer/schema'
import { createClient } from '@/lib/supabase/server'

export type CvEnhanceState = {
  readonly error?: string
  readonly warning?: string
  readonly result?: CvEnhancerResult
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function enhanceCvAction(_prevState: CvEnhanceState, formData: FormData): Promise<CvEnhanceState> {
  const user = await requireUserSession()
  const usage = await assertUsageAllowed(user.id, 'cvUpload')
  if (!usage.allowed) return { error: usage.message }

  const cvVersionId = getString(formData, 'cvVersionId')
  const targetRole = getString(formData, 'targetRole') || 'Target role'
  const jobDescription = getString(formData, 'jobDescription')
  const language = getString(formData, 'language') === 'fr' ? 'fr' : 'en'
  const styleInput = getString(formData, 'style')
  const style = ['ats', 'executive', 'concise', 'impact'].includes(styleInput) ? styleInput as 'ats' | 'executive' | 'concise' | 'impact' : 'ats'

  if (!cvVersionId) return { error: 'Choose a CV version first.' }

  const supabase = createClient()
  const { data: cv, error: cvError } = await supabase
    .from('cv_versions')
    .select('id,name,file_name,parsed_text')
    .eq('id', cvVersionId)
    .eq('user_id', user.id)
    .single()

  if (cvError || !cv?.parsed_text) return { error: 'CV version not found or not parsed.' }

  const result = await generateCvEnhancement({ cvText: cv.parsed_text, targetRole, jobDescription, language, style })

  const { error: insertError } = await supabase.from('cv_versions').insert({
    user_id: user.id,
    name: `Enhanced: ${targetRole}`,
    file_url: `generated/${user.id}/${Date.now()}-enhanced.txt`,
    file_name: `${targetRole.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)}-enhanced.txt`,
    parsed_text: result.enhanced_cv_text,
    is_base: false,
    target_role: targetRole,
    ats_score: result.readiness_score
  })

  revalidatePath('/cv-enhancer')
  revalidatePath('/dashboard')

  if (insertError) return { result, warning: insertError.message }
  return { result }
}
