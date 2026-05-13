import { getUserPlan } from '@/lib/billing/profile-plan'
import { getUsageSnapshot, type UsageSnapshot } from '@/lib/billing/usage'

export type UsageFeature = 'atsScan' | 'cvUpload' | 'coverLetter' | 'interviewPrep' | 'applicationTracking' | 'iprExport'

const featureLabels: Record<UsageFeature, string> = {
  atsScan: 'ATS scans',
  cvUpload: 'CV uploads',
  coverLetter: 'cover letters',
  interviewPrep: 'interview prep sessions',
  applicationTracking: 'tracked applications',
  iprExport: 'IPR exports'
}

function limitFor(snapshot: UsageSnapshot, feature: UsageFeature): number {
  if (feature === 'atsScan') return snapshot.plan.limits.atsScansPerMonth
  if (feature === 'cvUpload') return snapshot.plan.limits.cvUploads
  if (feature === 'coverLetter') return snapshot.plan.limits.coverLettersPerMonth
  if (feature === 'interviewPrep') return snapshot.plan.limits.interviewPrepsPerMonth
  if (feature === 'applicationTracking') return snapshot.plan.limits.trackedApplications
  return snapshot.plan.limits.iprExportsPerMonth
}

function countFor(snapshot: UsageSnapshot, feature: UsageFeature): number {
  if (feature === 'atsScan') return snapshot.counts.atsScans
  if (feature === 'cvUpload') return snapshot.counts.cvVersions
  if (feature === 'coverLetter') return snapshot.counts.coverLetters
  if (feature === 'interviewPrep') return snapshot.counts.interviewPreps
  if (feature === 'applicationTracking') return snapshot.counts.applications
  return snapshot.counts.iprExports
}

export async function assertUsageAllowed(userId: string, feature: UsageFeature): Promise<{ allowed: true; snapshot: UsageSnapshot } | { allowed: false; message: string; snapshot: UsageSnapshot }> {
  const plan = await getUserPlan(userId)
  const snapshot = await getUsageSnapshot(userId, plan.id)
  const allowed = snapshot.canUse[feature]

  if (allowed) return { allowed: true, snapshot }

  const label = featureLabels[feature]
  const limit = limitFor(snapshot, feature)
  const count = countFor(snapshot, feature)

  return {
    allowed: false,
    snapshot,
    message: `You have reached your ${label} limit on the ${snapshot.plan.name} plan (${count}/${limit}). Upgrade or wait until the monthly limit resets.`
  }
}
