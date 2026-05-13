import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { updateApplicationStatusAction } from '@/app/tracker/actions'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getApplicationById } from '@/lib/tracker/data'
import { getApplicationInsight, riskClassName } from '@/lib/tracker/intelligence'
import { kanbanStatuses, statusLabels } from '@/lib/tracker/schema'

type PageProps = {
  readonly params: { readonly id: string }
}

export default async function ApplicationDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const user = await requireUserSession()
  const application = await getApplicationById(user.id, params.id)

  if (!application) notFound()

  const insight = getApplicationInsight(application)
  const score = application.atsScore ?? 0

  return (
    <AppShell>
      <PageScaffold title={application.jobTitle} subtitle={`${application.companyName} · ${statusLabels[application.status]}`}>
        <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <Card>
            <CardHeader><CardTitle>Application intelligence</CardTitle></CardHeader>
            <div className="grid gap-4 md:grid-cols-3">
              <div className={`rounded-md border p-4 ${riskClassName(insight.risk)}`}>
                <p className="text-xs uppercase tracking-[0.16em]">Health</p>
                <strong className="mt-2 block text-xl">{insight.healthLabel}</strong>
              </div>
              <div className="rounded-md border border-border bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Days open</p>
                <strong className="mt-2 block text-xl text-[var(--text-primary)]">{insight.daysOpen}</strong>
              </div>
              <div className="rounded-md border border-border bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">ATS score</p>
                <strong className="mt-2 block text-xl text-[var(--text-primary)]">{application.atsScore ? `${application.atsScore}%` : '—'}</strong>
              </div>
            </div>
            <div className="mt-5 rounded-md border border-border bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-accent">Recommended next action</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{insight.nextAction}</p>
            </div>
            <div className="mt-5 grid gap-3">
              <ProgressRow label="ATS score" value={score} tone={score >= 70 ? 'emerald' : 'amber'} />
              <ProgressRow label="Pipeline health" value={insight.risk === 'low' ? 90 : insight.risk === 'medium' ? 55 : insight.risk === 'high' ? 25 : 70} tone={insight.risk === 'high' ? 'red' : insight.risk === 'medium' ? 'amber' : 'emerald'} />
              <ProgressRow label="Follow-up urgency" value={insight.risk === 'high' ? 95 : insight.risk === 'medium' ? 60 : 25} tone={insight.risk === 'high' ? 'red' : 'amber'} />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <form action={updateApplicationStatusAction} className="grid gap-3">
              <input type="hidden" name="applicationId" value={application.id} />
              <select name="status" defaultValue={application.status} className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none">
                {kanbanStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
                <option value="accepted">Accepted</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="no_response">No response</option>
              </select>
              <button className="rounded-md border border-border bg-elevated px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]" type="submit">Update status</button>
            </form>
            <div className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)]">
              <p><strong className="text-[var(--text-primary)]">Platform:</strong> {application.platform ?? 'Not specified'}</p>
              <p><strong className="text-[var(--text-primary)]">Applied:</strong> {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : 'Not specified'}</p>
              {application.jobUrl ? <a className="text-accent" href={application.jobUrl} target="_blank" rel="noreferrer">Open original job link</a> : null}
              <Link className="text-accent" href="/tracker">Back to tracker</Link>
            </div>
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Job description</CardTitle></CardHeader>
          {application.jobDescription ? <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-elevated p-4 text-sm leading-7 text-[var(--text-secondary)]">{application.jobDescription}</pre> : <p className="text-sm text-[var(--text-muted)]">No job description saved for this application.</p>}
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
