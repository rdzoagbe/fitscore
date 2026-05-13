import { cn } from '@/lib/utils'

type Tone = 'blue' | 'violet' | 'emerald' | 'amber' | 'red'

const borderByTone: Record<Tone, string> = {
  blue: 'border-t-accent',
  violet: 'border-t-violet',
  emerald: 'border-t-emerald',
  amber: 'border-t-amber',
  red: 'border-t-danger'
}

interface KpiCardProps {
  readonly label: string
  readonly value: string
  readonly helper: string
  readonly tone?: Tone
}

export function KpiCard({ label, value, helper, tone = 'blue' }: KpiCardProps): JSX.Element {
  return (
    <article className={cn('rounded-lg border border-border border-t-2 bg-surface p-4', borderByTone[tone])}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <strong className="mt-2 block font-display text-4xl italic font-normal text-[var(--text-primary)]">{value}</strong>
      <span className="mt-1 block text-xs text-[var(--text-secondary)]">{helper}</span>
    </article>
  )
}
