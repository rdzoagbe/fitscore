import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ApplicationCard } from '@/components/tracker/ApplicationCard'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getApplications, getTrackerStats, groupApplicationsByStatus, type ApplicationItem } from '@/lib/tracker/data'
import { kanbanStatuses, statusLabels, type ApplicationStatus } from '@/lib/tracker/schema'
import { ApplicationForm } from './ApplicationForm'

function emptyGroupedApplications(): Record<ApplicationStatus, ApplicationItem[]> {
  return {
    wishlist: [],
    applied: [],
    screening: [],
    interview_1: [],
    interview_2: [],
    technical_test: [],
    offer: [],
    accepted: [],
    rejected: [],
    withdrawn: [],
    no_response: []
  }
}

export default async function TrackerPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  let applications: ApplicationItem[] = []
  let grouped = emptyGroupedApplications()
  let loadError: string | null = null

  try {
    applications = await getApplications(user.id)
    grouped = groupApplicationsByStatus(applications)
  } catch (error) {
    console.error('Tracker page failed to load applications', error)
    loadError = 'The tracker data could not be loaded, but the page is still available for testing.'
  }

  const stats = getTrackerStats(applications)

  return (
    <AppShell>
      <PageScaffold title="Job Tracker" subtitle="Kanban pipeline for applications, interviews and outcomes">
        {loadError ? (
          <Card className="border-danger/30 bg-danger/10">
            <p className="text-sm text-danger">{loadError}</p>
          </Card>
        ) : null}

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
          {kanbanStatuses.map(status => {
            const items = grouped[status] ?? []
            return (
              <Card key={status} className="min-h-80 p-3">
                <CardHeader className="mb-3"><CardTitle className="text-base">{statusLabels[status]}</CardTitle></CardHeader>
                <div className="grid gap-2">
                  {items.length === 0 ? (
                    <p className="rounded-md border border-border bg-elevated p-3 text-xs text-[var(--text-muted)]">No applications.</p>
                  ) : (
                    items.map(item => <ApplicationCard key={item.id} item={item} />)
                  )}
                </div>
              </Card>
            )
          })}
        </section>
      </PageScaffold>
    </AppShell>
  )
}
