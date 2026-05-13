import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getKeywordIntelligence } from '@/lib/keywords/intelligence'

function toneForCoverage(value: number): 'emerald' | 'amber' | 'red' {
  if (value >= 75) return 'emerald'
  if (value >= 55) return 'amber'
  return 'red'
}

function priorityClass(priority: 'critical' | 'medium' | 'good'): string {
  if (priority === 'critical') return 'border-danger/20 bg-danger/10 text-danger'
  if (priority === 'medium') return 'border-amber/20 bg-amber/10 text-amber'
  return 'border-emerald/20 bg-emerald/10 text-emerald'
}

export default async function KeywordsPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const intelligence = await getKeywordIntelligence(user.id)

  return (
    <AppShell>
      <PageScaffold title="Keywords" subtitle="Keyword intelligence from your saved ATS scans">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Coverage Score" value={`${intelligence.coverageScore}%`} helper="Matched vs missing signals" tone={toneForCoverage(intelligence.coverageScore)} />
          <KpiCard label="Critical Gaps" value={String(intelligence.criticalGaps)} helper="High-priority missing terms" tone={intelligence.criticalGaps > 0 ? 'red' : 'emerald'} />
          <KpiCard label="Matched Signals" value={String(intelligence.matchedTotal)} helper="Across recent scans" tone="emerald" />
          <KpiCard label="Scans Analysed" value={String(intelligence.totalScans)} helper="Latest ATS results" tone="violet" />
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Top matched keywords</CardTitle></CardHeader>
            <div className="grid gap-3">
              {intelligence.matchedKeywords.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No matched keywords yet. Run ATS scans first.</p> : intelligence.matchedKeywords.slice(0, 12).map(item => (
                <ProgressRow key={item.keyword} label={item.keyword} value={item.coverage} tone="emerald" />
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Priority gaps</CardTitle></CardHeader>
            <div className="grid gap-3">
              {intelligence.missingKeywords.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No missing keyword gaps yet.</p> : intelligence.missingKeywords.slice(0, 12).map(item => (
                <div key={item.keyword} className="grid gap-2 rounded-md border border-border bg-elevated p-3 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-[var(--text-primary)]">{item.keyword}</strong>
                    <span className="rounded border border-amber/20 bg-amber/10 px-2 py-1 text-[10px] text-amber">{item.weight}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Seen as missing in {item.scans} scan(s), total frequency {item.count}.</p>
                  <ProgressRow label="Gap frequency" value={item.coverage} tone={item.weight === 'critical' || item.weight === 'high' ? 'red' : 'amber'} />
                </div>
              ))}
            </div>
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Recommended keyword actions</CardTitle></CardHeader>
          <div className="grid gap-3 md:grid-cols-3">
            {intelligence.recommendations.map(item => (
              <article key={item.title} className={`rounded-md border p-4 ${priorityClass(item.priority)}`}>
                <h3 className="text-sm font-medium">{item.title}</h3>
                <p className="mt-2 text-xs leading-6">{item.detail}</p>
              </article>
            ))}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
