import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { buildTrackerAnalytics } from '@/lib/analytics/tracker'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getApplications } from '@/lib/tracker/data'

function toneForRate(value: number): 'emerald' | 'amber' | 'red' {
  if (value >= 30) return 'emerald'
  if (value >= 15) return 'amber'
  return 'red'
}

function insightClass(tone: 'good' | 'warning' | 'critical'): string {
  if (tone === 'good') return 'border-emerald/20 bg-emerald/10 text-emerald'
  if (tone === 'warning') return 'border-amber/20 bg-amber/10 text-amber'
  return 'border-danger/20 bg-danger/10 text-danger'
}

export default async function AnalyticsPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const applications = await getApplications(user.id, 300)
  const analytics = buildTrackerAnalytics(applications)
  const maxWeekly = Math.max(...analytics.weeklyMetrics.map(item => item.total), 1)

  return (
    <AppShell>
      <PageScaffold title="Analytics" subtitle="Application performance, platform ROI and interview conversion">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Applications" value={String(analytics.total)} helper="Tracked applications" />
          <KpiCard label="Response Rate" value={`${analytics.responseRate}%`} helper={`${analytics.responses} responses`} tone={toneForRate(analytics.responseRate)} />
          <KpiCard label="Interview Rate" value={`${analytics.interviewRate}%`} helper={`${analytics.interviews} interviews/tests`} tone="violet" />
          <KpiCard label="Top Platform" value={analytics.topPlatform?.platform ?? '—'} helper={analytics.topPlatform ? `${analytics.topPlatform.responseRate}% response rate` : 'No data yet'} tone="amber" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader><CardTitle>Applications per week</CardTitle></CardHeader>
            {analytics.weeklyMetrics.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No application history yet.</p>
            ) : (
              <div className="flex h-64 items-end gap-1 rounded-md border border-border bg-elevated p-4">
                {analytics.weeklyMetrics.map(item => (
                  <span key={item.label} title={`${item.label}: ${item.total}`} className="flex-1 rounded-t bg-accent/70" style={{ height: `${Math.max(12, (item.total / maxWeekly) * 220)}px` }} />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
              {analytics.weeklyMetrics.map(item => <span key={item.label}>{item.label}</span>)}
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>By platform</CardTitle></CardHeader>
            <div className="grid gap-3">
              {analytics.platformMetrics.length === 0 ? <p className="text-sm text-[var(--text-muted)]">Add applications with platforms to compare performance.</p> : analytics.platformMetrics.slice(0, 8).map(item => (
                <ProgressRow key={item.platform} label={item.platform} value={item.responseRate} tone={item.responseRate >= 30 ? 'emerald' : item.responseRate >= 15 ? 'amber' : 'red'} />
              ))}
            </div>
          </Card>
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Conversion funnel</CardTitle></CardHeader>
            <div className="grid gap-3">
              <ProgressRow label="Responses" value={analytics.responseRate} tone={toneForRate(analytics.responseRate)} />
              <ProgressRow label="Interviews" value={analytics.interviewRate} tone={analytics.interviewRate >= 15 ? 'emerald' : 'amber'} />
              <ProgressRow label="Offers" value={analytics.offerRate} tone={analytics.offerRate > 0 ? 'emerald' : 'amber'} />
              <ProgressRow label="Rejections" value={analytics.rejectionRate} tone="red" />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Performance insights</CardTitle></CardHeader>
            <div className="grid gap-3">
              {analytics.insights.map(item => (
                <article key={item.title} className={`rounded-md border p-4 ${insightClass(item.tone)}`}>
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6">{item.detail}</p>
                </article>
              ))}
            </div>
          </Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
