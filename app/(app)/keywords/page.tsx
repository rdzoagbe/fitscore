import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'

export default function KeywordsPage(): JSX.Element {
  return (
    <PageScaffold title="Keywords" subtitle="Market keyword intelligence from scanned job descriptions">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Present in CV" value="38" helper="of top 50" />
        <KpiCard label="Gaps Found" value="12" helper="High priority: 4" tone="red" />
        <KpiCard label="Avg JD Frequency" value="6.2x" helper="per missing keyword" tone="emerald" />
        <KpiCard label="Roles Analysed" value="47" helper="Since Dec 2025" tone="violet" />
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top market keywords</CardTitle></CardHeader>
          <div className="grid gap-3">
            <ProgressRow label="Microsoft 365" value={94} tone="emerald" />
            <ProgressRow label="Azure" value={86} tone="emerald" />
            <ProgressRow label="ITIL" value={76} tone="emerald" />
            <ProgressRow label="Power BI" value={68} tone="amber" />
            <ProgressRow label="SAP" value={52} tone="red" />
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Priority gaps</CardTitle></CardHeader>
          <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
            <p>Power BI — present in 72% of target job descriptions.</p>
            <p>ServiceNow — translate existing ITSM experience into this keyword cluster.</p>
            <p>PMP / Prince2 — certification wording appears frequently in senior project roles.</p>
          </div>
        </Card>
      </section>
    </PageScaffold>
  )
}
