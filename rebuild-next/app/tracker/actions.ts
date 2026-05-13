'use server'

import { revalidatePath } from 'next/cache'
import { requireUserSession } from '@/lib/auth/profile-session'
import { createApplicationSchema, applicationStatusSchema } from '@/lib/tracker/schema'
import { createClient } from '@/lib/supabase/server'

export type TrackerActionState = {
  readonly error?: string
  readonly message?: string
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function createApplicationAction(_prevState: TrackerActionState, formData: FormData): Promise<TrackerActionState> {
  const user = await requireUserSession()

  const parsed = createApplicationSchema.safeParse({
    companyName: getString(formData, 'companyName'),
    jobTitle: getString(formData, 'jobTitle'),
    jobUrl: getString(formData, 'jobUrl'),
    jobDescription: getString(formData, 'jobDescription'),
    platform: getString(formData, 'platform'),
    status: getString(formData, 'status') || 'wishlist',
    appliedAt: getString(formData, 'appliedAt')
  })

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid application data.' }

  const supabase = createClient()
  const { error } = await supabase.from('applications').insert({
    user_id: user.id,
    company_name: parsed.data.companyName,
    job_title: parsed.data.jobTitle,
    job_url: parsed.data.jobUrl || null,
    job_description: parsed.data.jobDescription || null,
    platform: parsed.data.platform || null,
    status: parsed.data.status,
    applied_at: parsed.data.appliedAt || null
  })

  if (error) return { error: error.message }

  revalidatePath('/tracker')
  revalidatePath('/dashboard')
  return { message: 'Application added to tracker.' }
}

export async function updateApplicationStatusAction(formData: FormData): Promise<void> {
  const user = await requireUserSession()
  const id = getString(formData, 'applicationId')
  const parsedStatus = applicationStatusSchema.safeParse(getString(formData, 'status'))

  if (!id || !parsedStatus.success) return

  const supabase = createClient()
  await supabase
    .from('applications')
    .update({ status: parsedStatus.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/tracker')
  revalidatePath('/dashboard')
}
