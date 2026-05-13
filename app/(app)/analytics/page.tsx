import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'

export default function AnalyticsPage(): JSX.Element {
  return (
    <PageScaffold title="Analytics" subtitle="Application performance, platform ROI and interview conversion">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Applications" value="47" helper="22 weeks active" />
        <KpiCard label="Response Rate" value="19%" helper="9 responses" tone="emerald" />
        <KpiCard label="Interview Rate" value="13%" helper="6 interviews" tone="violet" />
        <KpiCard label="Top Platform" value="APEC" helper="Best response rate" tone="amber" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader><CardTitle>Applications per week</CardTitle></CardHeader>
          <div className="flex h-64 items-end gap-1 rounded-md border border-border bg-elevated p-4">
            {Array.from({ length: 22 }).map((_, index) => (
              <span key={index} className="flex-1 rounded-t bg-accent/70" style={{ height: `${24 + index * 2.2}px` }} />
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>By platform</CardTitle></CardHeader>
          <div className="grid gap-3">
            <ProgressRow label="LinkedIn" value={90} />
            <ProgressRow label="APEC" value={50} tone="violet" />
            <ProgressRow label="HelloWork" value={30} />
            <ProgressRow label="Cadremploi" value={25} tone="amber" />
          </div>
        </Card>
      </section>
    </PageScaffold>
  )
}
