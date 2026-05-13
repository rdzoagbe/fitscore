import Link from 'next/link'
import type { NavItem } from '@/types'

const groups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'D' },
      { href: '/tracker', label: 'Job Tracker', icon: 'T' },
      { href: '/scanner', label: 'ATS Scanner', icon: 'S' },
      { href: '/cover-letters', label: 'Cover Letters', icon: 'C' }
    ]
  },
  {
    title: 'Prepare',
    items: [
      { href: '/interview', label: 'Interview Prep', icon: 'I' },
      { href: '/cv-enhancer', label: 'CV Enhancer', icon: 'V' },
      { href: '/keywords', label: 'Keywords', icon: 'K' }
    ]
  },
  {
    title: 'Reports',
    items: [
      { href: '/analytics', label: 'Analytics', icon: 'A' },
      { href: '/export-ipr', label: 'Export IPR', icon: 'E' }
    ]
  }
]

export function Sidebar(): JSX.Element {
  return (
    <aside className="hidden min-h-dvh w-64 shrink-0 border-r border-border bg-[var(--bg-input)] lg:block">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 border-b border-border px-4">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-sm font-semibold text-slate-950">J</span>
        <span>
          <strong className="block font-display text-lg italic font-normal">Joblytics</strong>
          <small className="text-xs text-[var(--text-muted)]">Application workspace</small>
        </span>
      </Link>
      <nav className="space-y-5 p-3">
        {groups.map(group => (
          <section key={group.title}>
            <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(item => (
                <Link key={item.href} href={item.href} className="focus-ring flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] transition hover:bg-elevated hover:text-[var(--text-primary)]">
                  <span className="grid h-6 w-6 place-items-center rounded-sm bg-elevated text-[10px] text-accent">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  )
}
