import type { ReactNode } from 'react'
import { Topbar } from '@/components/shell/Topbar'

interface PageScaffoldProps {
  readonly title: string
  readonly subtitle: string
  readonly children: ReactNode
}

export function PageScaffold({ title, subtitle, children }: PageScaffoldProps): JSX.Element {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 lg:p-6">{children}</main>
    </>
  )
}
