import { PreferenceControls } from '@/components/shell/PreferenceControls'

interface TopbarProps {
  readonly title: string
  readonly subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps): JSX.Element {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-[var(--bg-input)] px-4 lg:px-6">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl italic font-normal text-[var(--text-primary)]">{title}</h1>
        {subtitle ? <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <PreferenceControls />
        <form action="/logout" method="post">
          <button className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]" type="submit">Logout</button>
        </form>
      </div>
    </header>
  )
}
