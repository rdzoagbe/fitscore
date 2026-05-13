import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

const rows = ['Summit Paris', 'Capgemini', 'Dassault Systèmes', 'Société Générale', 'Orange Business', 'Thales']

export default function ExportIprPage(): JSX.Element {
  return (
    <AppShell>
      <PageScaffold title="Export IPR — France Travail" subtitle="Generate a review-ready job search evidence dossier">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Days Tracked" value="152" helper="Since Dec 12, 2025" />
          <KpiCard label="Applications" value="47" helper="All documented" tone="emerald" />
          <KpiCard label="Avg per Week" value="2.1" helper="Meets IPR quota" tone="violet" />
          <KpiCard label="Dossier Status" value="Ready" helper="All fields complete" tone="amber" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <Card>
            <CardHeader><CardTitle>Export formats</CardTitle></CardHeader>
            <div className="grid gap-3"><Button variant="primary">Generate PDF dossier</Button><Button>Export Excel history</Button><Button>Export CSV raw data</Button></div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Dossier preview</CardTitle></CardHeader>
            <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs text-[var(--text-secondary)]"><tbody>{rows.map((company, index) => <tr key={company} className="border-b border-border"><td className="py-3 pr-4">{index < 3 ? '13/05/26' : '09/05/26'}</td><td className="py-3 pr-4 text-[var(--text-primary)]">{company}</td><td className="py-3 pr-4">{index % 3 === 0 ? 'Entretien' : index % 2 === 0 ? 'Refusée' : 'Envoyée'}</td><td className="py-3 pr-4">{index % 2 === 0 ? 'Oui' : '—'}</td></tr>)}</tbody></table></div>
          </Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
