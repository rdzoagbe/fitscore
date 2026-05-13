import type { ApplicationItem } from '@/lib/tracker/data'
import type { ApplicationStatus } from '@/lib/tracker/schema'

export type ApplicationRisk = 'low' | 'medium' | 'high' | 'closed'

export type ApplicationInsight = {
  readonly daysOpen: number
  readonly risk: ApplicationRisk
  readonly nextAction: string
  readonly healthLabel: string
}

const closedStatuses: ApplicationStatus[] = ['accepted', 'rejected', 'withdrawn']

function daysBetween(start: string): number {
  const startDate = new Date(start)
  const diff = Date.now() - startDate.getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export function getApplicationInsight(item: ApplicationItem): ApplicationInsight {
  const referenceDate = item.appliedAt ?? item.createdAt
  const daysOpen = daysBetween(referenceDate)

  if (closedStatuses.includes(item.status)) {
    return {
      daysOpen,
      risk: 'closed',
      healthLabel: 'Closed',
      nextAction: item.status === 'accepted' ? 'Prepare onboarding and close the search loop.' : 'Archive lessons learned and refine targeting.'
    }
  }

  if (item.status === 'wishlist') {
    return {
      daysOpen,
      risk: daysOpen > 7 ? 'medium' : 'low',
      healthLabel: daysOpen > 7 ? 'Needs decision' : 'Ready to review',
      nextAction: 'Run an ATS scan and decide whether to apply.'
    }
  }

  if (item.status === 'applied') {
    if (daysOpen >= 14) return { daysOpen, risk: 'high', healthLabel: 'Follow-up overdue', nextAction: 'Send a concise follow-up or move to no response.' }
    if (daysOpen >= 7) return { daysOpen, risk: 'medium', healthLabel: 'Follow-up soon', nextAction: 'Prepare a follow-up message within 48 hours.' }
    return { daysOpen, risk: 'low', healthLabel: 'Fresh application', nextAction: 'Track recruiter response and prepare short pitch.' }
  }

  if (['screening', 'interview_1', 'interview_2', 'technical_test'].includes(item.status)) {
    return {
      daysOpen,
      risk: item.interviewAt ? 'low' : 'medium',
      healthLabel: item.interviewAt ? 'Scheduled' : 'Prepare actively',
      nextAction: 'Generate interview prep and prepare STAR examples.'
    }
  }

  if (item.status === 'offer') {
    return { daysOpen, risk: 'low', healthLabel: 'Offer stage', nextAction: 'Prepare salary positioning and decision criteria.' }
  }

  if (item.status === 'no_response') {
    return { daysOpen, risk: 'closed', healthLabel: 'No response', nextAction: 'Use as proof in IPR export and continue pipeline.' }
  }

  return { daysOpen, risk: 'medium', healthLabel: 'Review', nextAction: 'Review status and update next action.' }
}

export function riskClassName(risk: ApplicationRisk): string {
  if (risk === 'low') return 'border-emerald/20 bg-emerald/10 text-emerald'
  if (risk === 'medium') return 'border-amber/20 bg-amber/10 text-amber'
  if (risk === 'high') return 'border-danger/20 bg-danger/10 text-danger'
  return 'border-border bg-surface text-[var(--text-muted)]'
}
