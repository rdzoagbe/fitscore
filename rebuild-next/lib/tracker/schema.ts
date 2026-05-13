import { z } from 'zod'

export const applicationStatusSchema = z.enum([
  'wishlist',
  'applied',
  'screening',
  'interview_1',
  'interview_2',
  'technical_test',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
  'no_response'
])

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

export const createApplicationSchema = z.object({
  companyName: z.string().min(2).max(160),
  jobTitle: z.string().min(2).max(180),
  jobUrl: z.string().url().optional().or(z.literal('')).default(''),
  jobDescription: z.string().max(60000).optional().default(''),
  platform: z.string().max(120).optional().default(''),
  status: applicationStatusSchema.default('wishlist'),
  appliedAt: z.string().optional().default('')
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

export const statusLabels: Record<ApplicationStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  screening: 'Screening',
  interview_1: 'Interview 1',
  interview_2: 'Interview 2',
  technical_test: 'Technical test',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  no_response: 'No response'
}

export const kanbanStatuses: ApplicationStatus[] = ['wishlist', 'applied', 'screening', 'interview_1', 'technical_test', 'offer', 'rejected']
