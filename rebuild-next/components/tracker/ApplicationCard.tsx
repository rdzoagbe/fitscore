import Link from 'next/link'
import { statusLabels, kanbanStatuses } from '@/lib/tracker/schema'
import type { ApplicationItem } from '@/lib/tracker/data'
import { getApplicationInsight, riskClassName } from '@/lib/tracker/intelligence'
import { updateApplicationStatusAction } from '@/app/tracker/actions'

export function ApplicationCard({ item }: { readonly item: ApplicationItem }): JSX.Element {
  const insight = getApplicationInsight(item)

  return (
    <article className="rounded-md border border-border bg-elevated p-3 text-xs text-[var(--text-secondary)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/tracker/${item.id}`} className="truncate text-sm font-medium text-[var(--text-primary)] hover:text-accent">{item.jobTitle}</Link>
          <p className="mt-1 truncate text-[var(--text-muted)]">{item.companyName}</p>
        </div>
        {item.atsScore ? <span className="rounded border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] text-accent">{item.atsScore}%</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded border px-2 py-1 text-[10px] ${riskClassName(insight.risk)}`}>{insight.healthLabel}</span>
        <span className="rounded bg-surface px-2 py-1 text-[10px]">{insight.daysOpen}d</span>
        {item.platform ? <span className="rounded bg-surface px-2 py-1 text-[10px]">{item.platform}</span> : null}
        {item.appliedAt ? <span className="rounded bg-surface px-2 py-1 text-[10px]">{new Date(item.appliedAt).toLocaleDateString()}</span> : null}
      </div>
      <p className="mt-3 text-[10px] leading-5 text-[var(--text-muted)]">{insight.nextAction}</p>
      {item.jobUrl ? <a className="mt-3 block truncate text-[10px] text-accent" href={item.jobUrl} target="_blank" rel="noreferrer">Open job link</a> : null}
      <form action={updateApplicationStatusAction} className="mt-3 grid gap-2">
        <input type="hidden" name="applicationId" value={item.id} />
        <select name="status" defaultValue={item.status} className="min-h-9 rounded-md border border-border bg-surface px-2 text-xs text-[var(--text-primary)] outline-none">
          {kanbanStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
          <option value="accepted">Accepted</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="no_response">No response</option>
        </select>
        <button className="rounded-md border border-border bg-surface px-3 py-2 text-[10px] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]" type="submit">Update status</button>
      </form>
    </article>
  )
}
