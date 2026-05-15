import type { ReactNode } from 'react'
import { TopNav } from '@/components/shell/TopNav'
import { requireUserSession } from '@/lib/auth/profile-session'

interface AppShellProps {
  readonly children: ReactNode
}

export async function AppShell({ children }: AppShellProps): Promise<JSX.Element> {
  const currentUser = await requireUserSession()

  return (
    <div className="min-h-dvh bg-bg text-[var(--text-primary)]">
      <TopNav userName={currentUser.name} />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
