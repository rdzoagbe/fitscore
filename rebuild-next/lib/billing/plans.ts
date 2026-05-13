export type PlanId = 'free' | 'tier' | 'pro'

export type PlanDefinition = {
  readonly id: PlanId
  readonly name: string
  readonly priceMonthly: number
  readonly description: string
  readonly limits: {
    readonly atsScansPerMonth: number
    readonly cvUploads: number
    readonly coverLettersPerMonth: number
    readonly interviewPrepsPerMonth: number
    readonly trackedApplications: number
    readonly iprExportsPerMonth: number
  }
  readonly features: string[]
}

export const plans: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    description: 'For testing the core job-search cockpit.',
    limits: {
      atsScansPerMonth: 5,
      cvUploads: 2,
      coverLettersPerMonth: 3,
      interviewPrepsPerMonth: 3,
      trackedApplications: 25,
      iprExportsPerMonth: 1
    },
    features: [
      'Basic CV parsing',
      'Limited ATS scans',
      'Application tracker',
      'Basic dashboard',
      'One IPR export per month'
    ]
  },
  tier: {
    id: 'tier',
    name: 'Tier',
    priceMonthly: 5,
    description: 'For active job seekers who need regular tailoring.',
    limits: {
      atsScansPerMonth: 40,
      cvUploads: 10,
      coverLettersPerMonth: 25,
      interviewPrepsPerMonth: 20,
      trackedApplications: 250,
      iprExportsPerMonth: 10
    },
    features: [
      'More ATS scans',
      'More CV versions',
      'Cover letter generation',
      'Interview prep generation',
      'Tracker analytics',
      'IPR export history'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 10,
    description: 'For intensive search, reporting and advanced preparation.',
    limits: {
      atsScansPerMonth: 150,
      cvUploads: 50,
      coverLettersPerMonth: 100,
      interviewPrepsPerMonth: 75,
      trackedApplications: 1000,
      iprExportsPerMonth: 50
    },
    features: [
      'High-volume ATS scanning',
      'Advanced CV enhancement',
      'Full tracker intelligence',
      'Priority interview prep',
      'Frequent IPR exports',
      'Production-ready reporting'
    ]
  }
}

export function getPlan(planId: string | null | undefined): PlanDefinition {
  if (planId === 'tier' || planId === 'pro') return plans[planId]
  return plans.free
}

export function formatPrice(plan: PlanDefinition): string {
  return plan.priceMonthly === 0 ? '€0' : `€${plan.priceMonthly}/mo`
}
