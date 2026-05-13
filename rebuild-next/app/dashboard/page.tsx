import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export default function DashboardPage(): JSX.Element {
  return (
    <AppShell>
      <PageScaffold title="Dashboard" subtitle="Your job search cockpit overview">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Applications" value="47" helper="+8 this week" />
          <KpiCard label="Interviews" value="6" helper="+2 scheduled" tone="violet" />
          <KpiCard label="Avg ATS Score" value="74%" helper="+6pts vs last week" tone="emerald" />
          <KpiCard label="Response Rate" value="19%" helper="-2pts vs average" tone="amber" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr_22rem]">
          <Card><CardHeader><CardTitle>Application pipeline</CardTitle></CardHeader><div className="grid gap-3"><ProgressRow label="Applied" value={85} /><ProgressRow label="Screening" value={32} tone="violet" /><ProgressRow label="Interview" value={26} tone="emerald" /><ProgressRow label="Assessment" value={11} tone="amber" /><ProgressRow label="Rejected" value={18} tone="red" /></div></Card>
          <Card><CardHeader><CardTitle>Latest ATS score</CardTitle></CardHeader><div className="grid gap-3"><ProgressRow label="Keywords" value={88} tone="emerald" /><ProgressRow label="Experience" value={80} /><ProgressRow label="Skills" value={72} tone="violet" /><ProgressRow label="Format" value={58} tone="amber" /></div></Card>
          <Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><div className="grid gap-3 text-sm text-[var(--text-secondary)]">{['Summit Paris · Interview', 'Capgemini · Applied', 'BNP Paribas · Offer'].map(item => <p key={item}>{item}</p>)}</div></Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
