import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'

const columns = [
  { title: 'Applied', items: ['Capgemini · Chef de Projet SI', 'Thales · Senior Project Manager', 'Atos · IT Infrastructure Manager'] },
  { title: 'Screening', items: ['Dassault Systèmes · Infrastructure Manager', 'Orange Business · Service Delivery Manager'] },
  { title: 'Interview', items: ['Summit Paris · Business Applications Manager', 'Société Générale · IT Service Delivery'] },
  { title: 'Offer', items: ['BNP Paribas · Infrastructure Lead'] },
  { title: 'Rejected', items: ['L’Oréal · Digital Ops Manager', 'Renault · IT Project Manager'] }
]

export default function TrackerPage(): JSX.Element {
  return (
    <PageScaffold title="Job Tracker" subtitle="Kanban pipeline for applications, interviews and outcomes">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active" value="39" helper="In pipeline" />
        <KpiCard label="This Week" value="8" helper="+3 vs last week" tone="emerald" />
        <KpiCard label="Interviews" value="6" helper="2 this week" tone="violet" />
        <KpiCard label="Awaiting Reply" value="18" helper="Average 9 days" tone="amber" />
      </section>
      <section className="grid gap-3 xl:grid-cols-5">
        {columns.map(column => (
          <Card key={column.title} className="min-h-80">
            <CardHeader><CardTitle>{column.title}</CardTitle></CardHeader>
            <div className="grid gap-2">
              {column.items.map(item => (
                <div key={item} className="rounded-md border border-border bg-elevated p-3 text-xs text-[var(--text-secondary)]">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </PageScaffold>
  )
}
