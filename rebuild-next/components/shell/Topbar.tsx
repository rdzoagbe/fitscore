import { PreferenceControls } from '@/components/shell/PreferenceControls'
import { LogoutButton } from '@/components/shell/LogoutButton'

interface TopbarProps {
  readonly title: string
  readonly subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps): JSX.Element {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-white/5 bg-[#0f172a]/85 px-4 backdrop-blur-md lg:px-6">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl italic font-normal text-slate-200">{title}</h1>
        {subtitle ? <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <div className="flex h-9 w-[220px] items-center gap-2 rounded-lg border border-white/10 bg-[#1a2540] px-3 text-slate-500">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search jobs, companies…" className="min-w-0 flex-1 bg-transparent text-xs text-slate-300 outline-none placeholder:text-slate-600" />
        </div>
        <PreferenceControls />
        <LogoutButton />
      </div>
    </header>
  )
}
