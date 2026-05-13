import { z } from 'zod'

export const atsResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  scores: z.object({
    keywords: z.number().int().min(0).max(100),
    experience: z.number().int().min(0).max(100),
    skills: z.number().int().min(0).max(100),
    format: z.number().int().min(0).max(100),
    education: z.number().int().min(0).max(100)
  }),
  matched_keywords: z.array(z.object({
    keyword: z.string(),
    cv_count: z.number().int().min(0),
    jd_count: z.number().int().min(0),
    weight: z.enum(['critical', 'high', 'medium', 'low'])
  })).default([]),
  missing_keywords: z.array(z.object({
    keyword: z.string(),
    jd_count: z.number().int().min(0),
    weight: z.enum(['critical', 'high', 'medium', 'low']),
    suggestion: z.string()
  })).default([]),
  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'medium', 'good']),
    category: z.string(),
    issue: z.string(),
    fix: z.string(),
    before: z.string().nullable(),
    after: z.string().nullable()
  })).default([]),
  format_issues: z.array(z.string()).default([]),
  estimated_ranking_percentile: z.number().int().min(0).max(100),
  summary: z.string()
})

export type AtsResult = z.infer<typeof atsResultSchema>

export const atsRequestSchema = z.object({
  cvText: z.string().min(50).max(120000),
  jobDescription: z.string().min(80).max(60000),
  language: z.enum(['fr', 'en']).default('en')
})

export type AtsRequest = z.infer<typeof atsRequestSchema>
