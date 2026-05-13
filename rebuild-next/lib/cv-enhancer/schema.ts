import { z } from 'zod'

export const cvEnhancerRequestSchema = z.object({
  cvText: z.string().min(50).max(120000),
  targetRole: z.string().min(2).max(160).default('Target role'),
  jobDescription: z.string().max(60000).optional().default(''),
  language: z.enum(['fr', 'en']).default('en'),
  style: z.enum(['ats', 'executive', 'concise', 'impact']).default('ats')
})

export type CvEnhancerRequest = z.infer<typeof cvEnhancerRequestSchema>

export const cvEnhancerResultSchema = z.object({
  improved_summary: z.string().min(80).max(2500),
  improved_skills: z.array(z.string()).min(3).max(40),
  rewritten_bullets: z.array(z.object({
    before: z.string().nullable(),
    after: z.string().min(20).max(800),
    rationale: z.string().min(10).max(500)
  })).min(3).max(20),
  ats_keywords_to_add: z.array(z.string()).default([]),
  formatting_recommendations: z.array(z.string()).default([]),
  risk_notes: z.array(z.string()).default([]),
  enhanced_cv_text: z.string().min(200).max(50000),
  readiness_score: z.number().int().min(0).max(100),
  language: z.enum(['fr', 'en'])
})

export type CvEnhancerResult = z.infer<typeof cvEnhancerResultSchema>
