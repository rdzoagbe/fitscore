import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { buildIprEvidenceSummary, dossierStatusLabel, type IprEvidenceCategory } from '@/lib/ipr/evidence'
import { getApplications } from '@/lib/tracker/data'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(value))
}

function categoryClass(category: IprEvidenceCategory): string {
  if (category === 'positive' || category === 'offer') return 'border-emerald/20 bg-emerald/10 text-emerald'
  if (category === 'negative') return 'border-danger/20 bg-danger/10 text-danger'
  if (category === 'no_response') return 'border-amber/20 bg-amber/10 text-amber'
  return 'border-border bg-surface text-[var(--text-muted)]'
}

export default async function ExportIprPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const applications = await getApplications(user.id, 500)
  const summary = buildIprEvidenceSummary(applications)

  return (
    <AppShell>
      <PageScaffold title="Export IPR — France Travail" subtitle="Prepare a review-ready job search evidence dossier">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Days Tracked" value={String(summary.daysTracked)} helper={summary.firstDate ? `Since ${formatDate(summary.firstDate)}` : 'No date yet'} />
          <KpiCard label="Applications" value={String(summary.total)} helper="Tracked evidence" tone="emerald" />
          <KpiCard label="Avg per Week" value={String(summary.averagePerWeek)} helper="Search rhythm" tone="violet" />
          <KpiCard label="Dossier Status" value={dossierStatusLabel(summary.dossierStatus)} helper={`${summary.positive + summary.negative + summary.noResponse} classified proofs`} tone={summary.dossierStatus === 'ready' ? 'emerald' : 'amber'} />
        </section>
        <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle>Evidence summary</CardTitle></CardHeader>
            <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
              <div className="rounded-md border border-border bg-elevated p-3"><strong className="text-[var(--text-primary)]">Positive / interviews:</strong> {summary.positive}</div>
              <div className="rounded-md border border-border bg-elevated p-3"><strong className="text-[var(--text-primary)]">Offers:</strong> {summary.offers}</div>
              <div className="rounded-md border border-border bg-elevated p-3"><strong className="text-[var(--text-primary)]">Negative replies:</strong> {summary.negative}</div>
              <div className="rounded-md border border-border bg-elevated p-3"><strong className="text-[var(--text-primary)]">No response:</strong> {summary.noResponse}</div>
              <div className="rounded-md border border-border bg-elevated p-3"><strong className="text-[var(--text-primary)]">Pending:</strong> {summary.pending}</div>
            </div>
            <div className="mt-5 grid gap-3">
              <a href="/export-ipr/pdf" className="rounded-md bg-accent px-4 py-3 text-center text-sm font-medium text-slate-950 transition hover:opacity-90">Download PDF dossier</a>
              <a href="/export-ipr/csv" className="rounded-md border border-border bg-elevated px-4 py-3 text-center text-sm text-[var(--text-primary)] transition hover:border-[var(--border-strong)]">Download Excel-compatible CSV</a>
            </div>
            <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
              PDF and CSV exports are generated from your authenticated tracker data. CSV can be opened directly in Excel.
            </p>
          </Card>
          <Card>
            <CardHeader><CardTitle>Dossier preview</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-[var(--text-secondary)]">
                <thead>
                  <tr className="border-b border-border text-[var(--text-muted)]">
                    <th className="py-3 pr-4 font-normal">Date</th>
                    <th className="py-3 pr-4 font-normal">Company</th>
                    <th className="py-3 pr-4 font-normal">Role</th>
                    <th className="py-3 pr-4 font-normal">Evidence</th>
                    <th className="py-3 pr-4 font-normal">Platform</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.length === 0 ? (
                    <tr><td colSpan={5} className="py-5 text-[var(--text-muted)]">No tracked applications yet.</td></tr>
                  ) : summary.items.map(item => (
                    <tr key={item.id} className="border-b border-border align-top">
                      <td className="py-3 pr-4">{formatDate(item.appliedAt ?? item.createdAt)}</td>
                      <td className="py-3 pr-4 text-[var(--text-primary)]">{item.companyName}</td>
                      <td className="py-3 pr-4">{item.jobTitle}</td>
                      <td className="py-3 pr-4"><span className={`rounded border px-2 py-1 ${categoryClass(item.evidenceCategory)}`}>{item.evidenceLabel}</span><p className="mt-2 text-[10px] text-[var(--text-muted)]">{item.evidenceNote}</p></td>
                      <td className="py-3 pr-4">{item.platform ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
