import type { AtsHistoryItem } from '@/lib/ats/history'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald border-emerald/20 bg-emerald/10'
  if (score >= 55) return 'text-amber border-amber/20 bg-amber/10'
  return 'text-danger border-danger/20 bg-danger/10'
}

export function AtsAnalysisCard({ item, compact = false }: { readonly item: AtsHistoryItem; readonly compact?: boolean }): JSX.Element {
  const score = item.overallScore ?? item.result.overall_score

  return (
    <article className="rounded-lg border border-border bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">ATS analysis</p>
          <h3 className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">{item.cvVersion?.name ?? 'CV version'}</h3>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{item.cvVersion?.targetRole ?? item.cvVersion?.fileName ?? 'General role'} · {formatDate(item.createdAt)}</p>
        </div>
        <strong className={`rounded-md border px-3 py-2 font-display text-2xl italic font-normal ${scoreTone(score)}`}>{score}%</strong>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.result.summary}</p>
      {!compact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-[var(--text-primary)]">Matched keywords</p>
            <div className="flex flex-wrap gap-2">
              {item.result.matched_keywords.slice(0, 10).map(keyword => <span key={keyword.keyword} className="rounded border border-emerald/20 bg-emerald/10 px-2 py-1 text-xs text-emerald">{keyword.keyword}</span>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--text-primary)]">Missing keywords</p>
            <div className="flex flex-wrap gap-2">
              {item.result.missing_keywords.slice(0, 10).map(keyword => <span key={keyword.keyword} className="rounded border border-amber/20 bg-amber/10 px-2 py-1 text-xs text-amber">{keyword.keyword}</span>)}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
