import { navGroups } from '@/components/shell/NavLinks'

interface SidebarProps {
  readonly userName: string
  readonly userEmail: string
}

function initials(name: string): string {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'
}

export function Sidebar({ userName, userEmail }: SidebarProps): JSX.Element {
  return (
    <aside className="hidden min-h-dvh w-64 shrink-0 border-r border-border bg-[var(--bg-input)] lg:flex lg:flex-col">
      <a href="/dashboard" className="flex h-16 items-center gap-3 border-b border-border px-4">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-sm font-semibold text-slate-950">J</span>
        <span>
          <strong className="block font-display text-lg italic font-normal">Joblytics</strong>
          <small className="text-xs text-[var(--text-muted)]">Application workspace</small>
        </span>
      </a>
      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {navGroups.map(group => (
          <section key={group.title}>
            <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(item => (
                <a key={item.href} href={item.href} className="focus-ring flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] transition hover:bg-elevated hover:text-[var(--text-primary)]">
                  <span className="grid h-6 w-6 place-items-center rounded-sm bg-elevated text-[10px] text-accent">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-md border border-border bg-surface p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-elevated text-xs text-accent">{initials(userName)}</span>
        <span className="min-w-0">
          <strong className="block truncate text-xs text-[var(--text-primary)]">{userName}</strong>
          <small className="block truncate text-[10px] text-[var(--text-muted)]">{userEmail}</small>
        </span>
      </div>
    </aside>
  )
}
