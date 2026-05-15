import Link from 'next/link'
import { PreferenceControls } from '@/components/shell/PreferenceControls'

export function PublicNav(): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 px-5 backdrop-blur">
      <nav className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-sm font-semibold text-slate-950">J</span>
          <span>
            <strong className="block font-display text-lg italic font-normal text-[var(--text-primary)]">Joblytics</strong>
            <small className="hidden text-xs text-[var(--text-muted)] sm:block">Job search cockpit</small>
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          <PreferenceControls />
          <Link href="/pricing" className="rounded-md px-3 py-2 text-[var(--text-secondary)] transition hover:bg-elevated hover:text-[var(--text-primary)]">Pricing</Link>
          <Link href="/login" className="rounded-md border border-border bg-elevated px-3 py-2 text-[var(--text-primary)] transition hover:border-[var(--border-strong)]">Sign in</Link>
        </div>
      </nav>
    </header>
  )
}
