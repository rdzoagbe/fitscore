import type { ReactNode } from 'react'
import { requireUserSession } from '@/lib/auth/profile-session'
import { Sidebar } from '@/components/shell/Sidebar'

export async function AppShell({ children }: { readonly children: ReactNode }): Promise<JSX.Element> {
  const user = await requireUserSession()
  return (
    <div className="flex min-h-dvh bg-[var(--bg)]">
      <Sidebar userName={user.name} userEmail={user.email} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[var(--sidebar-w)]">
        <div className="h-14 shrink-0 lg:hidden" />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
