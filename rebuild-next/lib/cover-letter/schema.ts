import { z } from 'zod'

export const coverLetterRequestSchema = z.object({
  cvText: z.string().min(50).max(120000),
  jobTitle: z.string().min(2).max(160),
  companyName: z.string().min(2).max(160),
  jobDescription: z.string().min(80).max(60000),
  language: z.enum(['fr', 'en']).default('en'),
  tone: z.enum(['professional', 'confident', 'warm', 'executive']).default('professional')
})

export type CoverLetterRequest = z.infer<typeof coverLetterRequestSchema>

export const coverLetterResultSchema = z.object({
  subject: z.string().min(2).max(220),
  greeting: z.string().min(2).max(160),
  body: z.string().min(200).max(6000),
  closing: z.string().min(2).max(300),
  signature: z.string().min(1).max(160),
  bullets_used: z.array(z.string()).default([]),
  language: z.enum(['fr', 'en'])
})

export type CoverLetterResult = z.infer<typeof coverLetterResultSchema>

export function renderCoverLetter(result: CoverLetterResult): string {
  return [result.subject, '', result.greeting, '', result.body, '', result.closing, '', result.signature].join('\n')
}
