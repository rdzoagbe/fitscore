export type Locale = 'fr' | 'en'
export type Plan = 'free' | 'pro' | 'team'
export type ApplicationStatus = 'wishlist' | 'applied' | 'screening' | 'interview_1' | 'interview_2' | 'technical_test' | 'offer' | 'accepted' | 'rejected' | 'withdrawn' | 'no_response'
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface Profile {
  id: string
  fullName: string | null
  email: string
  plan: Plan
  language: Locale
  franceTravailId: string | null
  areStartDate: string | null
}

export interface Application {
  id: string
  userId: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  jobDescription: string | null
  status: ApplicationStatus
  platform: string | null
  atsScore: number | null
  appliedAt: string | null
  interviewAt: string | null
  createdAt: string
}

export interface AtsResult {
  overall_score: number
  scores: {
    keywords: number
    experience: number
    skills: number
    format: number
    education: number
  }
  matched_keywords: Array<{ keyword: string; cv_count: number; jd_count: number; weight: Priority }>
  missing_keywords: Array<{ keyword: string; jd_count: number; weight: Priority; suggestion: string }>
  recommendations: Array<{ priority: 'critical' | 'medium' | 'good'; category: string; issue: string; fix: string; before: string | null; after: string | null }>
  format_issues: string[]
  estimated_ranking_percentile: number
  summary: string
}

export interface NavItem {
  href: string
  label: string
  icon: string
}
