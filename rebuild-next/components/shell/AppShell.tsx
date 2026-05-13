import type { ReactNode } from 'react'
import { MobileNav } from '@/components/shell/MobileNav'
import { Sidebar } from '@/components/shell/Sidebar'
import { requireUserSession } from '@/lib/auth/profile-session'

interface AppShellProps {
  readonly children: ReactNode
}

export async function AppShell({ children }: AppShellProps): Promise<JSX.Element> {
  const currentUser = await requireUserSession()

  return (
    <div className="flex min-h-dvh bg-bg text-[var(--text-primary)]">
      <Sidebar userName={currentUser.name} userEmail={currentUser.email} />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      <MobileNav />
    </div>
  )
}
