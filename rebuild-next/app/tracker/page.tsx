import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ApplicationCard } from '@/components/tracker/ApplicationCard'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getApplications, getTrackerStats, groupApplicationsByStatus } from '@/lib/tracker/data'
import { kanbanStatuses, statusLabels } from '@/lib/tracker/schema'
import { ApplicationForm } from './ApplicationForm'

export default async function TrackerPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const applications = await getApplications(user.id)
  const grouped = groupApplicationsByStatus(applications)
  const stats = getTrackerStats(applications)

  return (
    <AppShell>
      <PageScaffold title="Job Tracker" subtitle="Kanban pipeline for applications, interviews and outcomes">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Active" value={String(stats.active)} helper="In pipeline" />
          <KpiCard label="Total" value={String(stats.total)} helper="Tracked applications" tone="emerald" />
          <KpiCard label="Interviews" value={String(stats.interviews)} helper="Interview or test stage" tone="violet" />
          <KpiCard label="Offers" value={String(stats.offers)} helper={`${stats.rejected} rejected`} tone="amber" />
        </section>
        <Card>
          <CardHeader><CardTitle>Add application</CardTitle></CardHeader>
          <ApplicationForm />
        </Card>
        <section className="grid gap-3 xl:grid-cols-7">
          {kanbanStatuses.map(status => (
            <Card key={status} className="min-h-80 p-3">
              <CardHeader className="mb-3"><CardTitle className="text-base">{statusLabels[status]}</CardTitle></CardHeader>
              <div className="grid gap-2">
                {grouped[status].length === 0 ? <p className="rounded-md border border-border bg-elevated p-3 text-xs text-[var(--text-muted)]">No applications.</p> : grouped[status].map(item => <ApplicationCard key={item.id} item={item} />)}
              </div>
            </Card>
          ))}
        </section>
      </PageScaffold>
    </AppShell>
  )
}
