import type { ReactNode } from 'react'

interface PageScaffoldProps {
  readonly title: string
  readonly subtitle: string
  readonly children: ReactNode
}

export function PageScaffold({ title, subtitle, children }: PageScaffoldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
