interface ProgressRowProps {
  readonly label: string
  readonly value: number
  readonly tone?: 'blue' | 'emerald' | 'violet' | 'amber' | 'red'
}

const colors = {
  blue: 'bg-accent',
  emerald: 'bg-emerald',
  violet: 'bg-violet',
  amber: 'bg-amber',
  red: 'bg-danger'
} as const

export function ProgressRow({ label, value, tone = 'blue' }: ProgressRowProps): JSX.Element {
  return (
    <div className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-xs text-[var(--text-secondary)]">
      <span className="truncate">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-bg">
        <i className={`block h-full rounded-full ${colors[tone]}`} style={{ width: `${value}%` }} />
      </span>
      <em className="not-italic text-[var(--text-muted)]">{value}%</em>
    </div>
  )
}
