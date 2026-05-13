import Link from 'next/link'
import { AtsAnalysisCard } from '@/components/ats/AtsAnalysisCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { buildTrackerAnalytics } from '@/lib/analytics/tracker'
import { getAtsHistory } from '@/lib/ats/history'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getApplications, getTrackerStats } from '@/lib/tracker/data'
import { getApplicationInsight, riskClassName } from '@/lib/tracker/intelligence'
import { statusLabels } from '@/lib/tracker/schema'

function averageScore(items: Awaited<ReturnType<typeof getAtsHistory>>): number {
  if (items.length === 0) return 0
  const total = items.reduce((sum, item) => sum + (item.overallScore ?? item.result.overall_score), 0)
  return Math.round(total / items.length)
}

function toneForRate(value: number): 'emerald' | 'amber' | 'red' {
  if (value >= 30) return 'emerald'
  if (value >= 15) return 'amber'
  return 'red'
}

function latestApplications(items: Awaited<ReturnType<typeof getApplications>>) {
  return [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const [atsHistory, applications] = await Promise.all([getAtsHistory(user.id, 5), getApplications(user.id, 120)])
  const latestAts = atsHistory[0]
  const avgAtsScore = averageScore(atsHistory)
  const trackerStats = getTrackerStats(applications)
  const analytics = buildTrackerAnalytics(applications)
  const recentApplications = latestApplications(applications)

  return (
    <AppShell>
      <PageScaffold title="Dashboard" subtitle="Your live job search cockpit overview">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active Applications" value={String(trackerStats.active)} helper={`${trackerStats.total} tracked total`} />
          <KpiCard label="Response Rate" value={`${analytics.responseRate}%`} helper={`${analytics.responses} responses`} tone={toneForRate(analytics.responseRate)} />
          <KpiCard label="Latest ATS Score" value={latestAts ? `${latestAts.overallScore ?? latestAts.result.overall_score}%` : '—'} helper={latestAts?.cvVersion?.name ?? 'No scan yet'} tone="violet" />
          <KpiCard label="Avg ATS Score" value={atsHistory.length ? `${avgAtsScore}%` : '—'} helper={atsHistory.length ? 'Across recent scans' : 'Run your first scan'} tone="emerald" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr_22rem]">
          <Card>
            <CardHeader><CardTitle>Application pipeline</CardTitle></CardHeader>
            <div className="grid gap-3">
              <ProgressRow label="Responses" value={analytics.responseRate} tone={toneForRate(analytics.responseRate)} />
              <ProgressRow label="Interviews" value={analytics.interviewRate} tone={analytics.interviewRate >= 15 ? 'emerald' : 'amber'} />
              <ProgressRow label="Offers" value={analytics.offerRate} tone={analytics.offerRate > 0 ? 'emerald' : 'amber'} />
              <ProgressRow label="Rejections" value={analytics.rejectionRate} tone="red" />
            </div>
            <Link href="/analytics" className="mt-4 inline-block text-xs text-accent">Open analytics</Link>
          </Card>
          <Card>
            <CardHeader><CardTitle>Latest ATS breakdown</CardTitle></CardHeader>
            {latestAts ? (
              <div className="grid gap-3">
                <ProgressRow label="Keywords" value={latestAts.result.scores.keywords} tone="emerald" />
                <ProgressRow label="Experience" value={latestAts.result.scores.experience} />
                <ProgressRow label="Skills" value={latestAts.result.scores.skills} tone="violet" />
                <ProgressRow label="Format" value={latestAts.result.scores.format} tone="amber" />
                <ProgressRow label="Education" value={latestAts.result.scores.education} />
              </div>
            ) : <p className="text-sm text-[var(--text-muted)]">No ATS scan yet. Open ATS Scanner to analyze a job description.</p>}
            <Link href="/scanner" className="mt-4 inline-block text-xs text-accent">Open ATS scanner</Link>
          </Card>
          <Card>
            <CardHeader><CardTitle>Priority insight</CardTitle></CardHeader>
            <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
              {analytics.insights[0] ? (
                <>
                  <p className="text-[var(--text-primary)]">{analytics.insights[0].title}</p>
                  <p className="text-xs leading-6 text-[var(--text-muted)]">{analytics.insights[0].detail}</p>
                </>
              ) : <p>No insight yet. Add applications and run scans.</p>}
              {analytics.topPlatform ? <p className="text-xs text-[var(--text-muted)]">Best platform: {analytics.topPlatform.platform} · {analytics.topPlatform.responseRate}% response rate.</p> : null}
            </div>
          </Card>
        </section>
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader><CardTitle>Recent applications</CardTitle></CardHeader>
            <div className="grid gap-3">
              {recentApplications.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No applications yet. Add your first application in Job Tracker.</p> : recentApplications.map(item => {
                const insight = getApplicationInsight(item)
                return (
                  <Link key={item.id} href={`/tracker/${item.id}`} className="rounded-md border border-border bg-elevated p-3 text-sm transition hover:border-[var(--border-strong)]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <strong className="block truncate text-[var(--text-primary)]">{item.jobTitle}</strong>
                        <small className="block truncate text-[var(--text-muted)]">{item.companyName} · {statusLabels[item.status]}</small>
                      </span>
                      <span className={`shrink-0 rounded border px-2 py-1 text-[10px] ${riskClassName(insight.risk)}`}>{insight.healthLabel}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{insight.nextAction}</p>
                  </Link>
                )
              })}
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Latest ATS analyses</CardTitle></CardHeader>
            <div className="grid gap-3">
              {atsHistory.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No saved analyses yet. Upload a CV and run your first ATS scan.</p> : atsHistory.map(item => <AtsAnalysisCard key={item.id} item={item} compact />)}
            </div>
          </Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
