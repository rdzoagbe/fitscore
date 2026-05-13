import { MobileNav } from '@/components/shell/MobileNav'
import { Sidebar } from '@/components/shell/Sidebar'

export default function AppShellLayout({ children }: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <div className="flex min-h-dvh bg-bg text-[var(--text-primary)]">
      <Sidebar />
      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
      <MobileNav />
    </div>
  )
}
