'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/shell/Logo'
import { LogoutButton } from '@/components/shell/LogoutButton'
import { navGroups } from '@/components/shell/NavLinks'

interface SidebarProps {
  readonly userName: string
  readonly userEmail: string
}

function initials(name: string): string {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'
}

export function Sidebar({ userName, userEmail }: SidebarProps): JSX.Element {
  const pathname = usePathname()

  return (
    <aside className="hidden min-h-dvh w-64 shrink-0 border-r border-white/5 bg-[#1a2540] lg:flex lg:flex-col">
      <div className="border-b border-white/5 px-4 py-4">
        <Logo />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {navGroups.map(group => (
          <section key={group.title}>
            <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.18em] text-slate-600">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`focus-ring flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm transition ${active ? 'border-sky-400/20 bg-sky-400/10 text-sky-400' : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                    <span className="grid h-6 w-6 place-items-center rounded-sm bg-white/5 text-[10px] text-sky-400">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-md border border-white/5 bg-[#0f172a] p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/5 text-xs text-sky-400">{initials(userName)}</span>
          <span className="min-w-0">
            <strong className="block truncate text-xs text-slate-200">{userName}</strong>
            <small className="block truncate text-[10px] text-slate-500">{userEmail}</small>
          </span>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  )
}
