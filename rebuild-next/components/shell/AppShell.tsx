import type { ReactNode } from 'react'
import { MobileNav } from '@/components/shell/MobileNav'
import { Sidebar } from '@/components/shell/Sidebar'

interface AppShellProps {
  readonly children: ReactNode
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-dvh bg-bg text-[var(--text-primary)]">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      <MobileNav />
    </div>
  )
}
