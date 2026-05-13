import { z } from 'zod'

export const interviewPrepRequestSchema = z.object({
  cvText: z.string().min(50).max(120000),
  jobTitle: z.string().min(2).max(160),
  companyName: z.string().min(2).max(160),
  jobDescription: z.string().min(80).max(60000),
  language: z.enum(['fr', 'en']).default('en'),
  seniority: z.enum(['mid', 'senior', 'leadership', 'executive']).default('senior')
})

export type InterviewPrepRequest = z.infer<typeof interviewPrepRequestSchema>

export const interviewPrepResultSchema = z.object({
  role_pitch: z.string().min(80).max(2000),
  likely_questions: z.array(z.object({
    question: z.string().min(10).max(500),
    why_they_ask: z.string().min(10).max(800),
    strong_answer: z.string().min(40).max(2000),
    star_structure: z.object({
      situation: z.string().min(5).max(700),
      task: z.string().min(5).max(700),
      action: z.string().min(5).max(900),
      result: z.string().min(5).max(700)
    })
  })).min(4).max(12),
  technical_topics: z.array(z.string()).default([]),
  questions_to_ask: z.array(z.string()).default([]),
  salary_positioning: z.string().min(20).max(1500),
  risks_to_prepare: z.array(z.object({ risk: z.string(), response: z.string() })).default([]),
  confidence_score: z.number().int().min(0).max(100),
  language: z.enum(['fr', 'en'])
})

export type InterviewPrepResult = z.infer<typeof interviewPrepResultSchema>
