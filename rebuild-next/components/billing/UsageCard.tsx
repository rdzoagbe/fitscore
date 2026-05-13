import type { UsageSnapshot } from '@/lib/billing/usage'

export type UsageMetric = {
  readonly label: string
  readonly used: number
  readonly limit: number
}

function percentage(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function toneClass(value: number): string {
  if (value >= 90) return 'bg-danger'
  if (value >= 70) return 'bg-amber'
  return 'bg-emerald'
}

export function usageMetricsFromSnapshot(snapshot: UsageSnapshot): UsageMetric[] {
  return [
    { label: 'ATS scans', used: snapshot.counts.atsScans, limit: snapshot.plan.limits.atsScansPerMonth },
    { label: 'CV versions', used: snapshot.counts.cvVersions, limit: snapshot.plan.limits.cvUploads },
    { label: 'Cover letters', used: snapshot.counts.coverLetters, limit: snapshot.plan.limits.coverLettersPerMonth },
    { label: 'Interview prep', used: snapshot.counts.interviewPreps, limit: snapshot.plan.limits.interviewPrepsPerMonth },
    { label: 'Applications', used: snapshot.counts.applications, limit: snapshot.plan.limits.trackedApplications },
    { label: 'IPR exports', used: snapshot.counts.iprExports, limit: snapshot.plan.limits.iprExportsPerMonth }
  ]
}

export function UsageCard({ metric }: { readonly metric: UsageMetric }): JSX.Element {
  const value = percentage(metric.used, metric.limit)
  const remaining = Math.max(0, metric.limit - metric.used)

  return (
    <article className="rounded-md border border-border bg-elevated p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">{metric.label}</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{remaining} remaining</p>
        </div>
        <strong className="text-sm text-[var(--text-primary)]">{metric.used}/{metric.limit}</strong>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
        <span className={`block h-full rounded-full ${toneClass(value)}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-muted)]">{value}% used</p>
    </article>
  )
}
