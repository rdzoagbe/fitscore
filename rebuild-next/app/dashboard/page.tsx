import { AtsAnalysisCard } from '@/components/ats/AtsAnalysisCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { getAtsHistory } from '@/lib/ats/history'
import { requireUserSession } from '@/lib/auth/profile-session'

function averageScore(items: Awaited<ReturnType<typeof getAtsHistory>>): number {
  if (items.length === 0) return 0
  const total = items.reduce((sum, item) => sum + (item.overallScore ?? item.result.overall_score), 0)
  return Math.round(total / items.length)
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const history = await getAtsHistory(user.id, 5)
  const latest = history[0]
  const avgScore = averageScore(history)

  return (
    <AppShell>
      <PageScaffold title="Dashboard" subtitle="Your job search cockpit overview">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Saved ATS scans" value={String(history.length)} helper="Latest saved analyses" />
          <KpiCard label="Latest ATS Score" value={latest ? `${latest.overallScore ?? latest.result.overall_score}%` : '—'} helper={latest?.cvVersion?.name ?? 'No scan yet'} tone="violet" />
          <KpiCard label="Avg ATS Score" value={history.length ? `${avgScore}%` : '—'} helper={history.length ? 'Across recent scans' : 'Run your first scan'} tone="emerald" />
          <KpiCard label="CV Version" value={latest?.cvVersion ? 'Ready' : 'None'} helper={latest?.cvVersion?.targetRole ?? 'Upload a CV to begin'} tone="amber" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr_22rem]">
          <Card><CardHeader><CardTitle>Application pipeline</CardTitle></CardHeader><div className="grid gap-3"><ProgressRow label="Applied" value={85} /><ProgressRow label="Screening" value={32} tone="violet" /><ProgressRow label="Interview" value={26} tone="emerald" /><ProgressRow label="Assessment" value={11} tone="amber" /><ProgressRow label="Rejected" value={18} tone="red" /></div></Card>
          <Card><CardHeader><CardTitle>Latest ATS breakdown</CardTitle></CardHeader>{latest ? <div className="grid gap-3"><ProgressRow label="Keywords" value={latest.result.scores.keywords} tone="emerald" /><ProgressRow label="Experience" value={latest.result.scores.experience} /><ProgressRow label="Skills" value={latest.result.scores.skills} tone="violet" /><ProgressRow label="Format" value={latest.result.scores.format} tone="amber" /><ProgressRow label="Education" value={latest.result.scores.education} /></div> : <p className="text-sm text-[var(--text-muted)]">No ATS scan yet. Open ATS Scanner to analyze a job description.</p>}</Card>
          <Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><div className="grid gap-3 text-sm text-[var(--text-secondary)]">{history.length === 0 ? <p>No recent ATS activity.</p> : history.slice(0, 3).map(item => <p key={item.id}>{item.cvVersion?.name ?? 'CV'} · {(item.overallScore ?? item.result.overall_score)}%</p>)}</div></Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Latest ATS analyses</CardTitle></CardHeader>
          <div className="grid gap-3">
            {history.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No saved analyses yet. Upload a CV and run your first ATS scan.</p> : history.map(item => <AtsAnalysisCard key={item.id} item={item} compact />)}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
