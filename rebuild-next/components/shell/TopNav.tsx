'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/shell/Logo'
import { LogoutButton } from '@/components/shell/LogoutButton'
import { PreferenceControls } from '@/components/shell/PreferenceControls'

const navItems = [
  { href: '/scanner', label: 'Analyze' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/cover-letters', label: 'Cover Letters' },
  { href: '/interview', label: 'Interview' },
  { href: '/linkedin', label: 'LinkedIn' },
  { href: '/analytics', label: 'Analytics' },
] as const

interface TopNavProps {
  readonly userName: string
}

export function TopNav({ userName }: TopNavProps): JSX.Element {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f172a]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <div className="flex items-center">
          <div className="mr-6 py-3">
            <Logo />
          </div>
          <nav className="hidden items-center md:flex">
            {navItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex h-14 items-center px-3 text-sm font-medium transition ${
                    active
                      ? 'text-[var(--accent)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-[var(--accent)]" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <PreferenceControls />
          <span className="hidden text-xs text-slate-500 md:block">{userName}</span>
          <LogoutButton />
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t border-white/5 md:hidden">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative shrink-0 px-4 py-2.5 text-xs font-medium transition ${
                active ? 'text-[var(--accent)]' : 'text-slate-500'
              }`}
            >
              {item.label}
              {active && (
                <span className="absolute bottom-0 inset-x-4 h-0.5 rounded-full bg-[var(--accent)]" />
              )}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
