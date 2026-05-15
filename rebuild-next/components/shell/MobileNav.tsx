'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mobileNavItems } from '@/components/shell/NavLinks'

export function MobileNav(): JSX.Element {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#1a2540]/95 p-1 shadow-2xl backdrop-blur lg:hidden">
      {mobileNavItems.map(item => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`relative grid min-h-12 place-items-center rounded-md text-[10px] transition ${active ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>
            {active ? <span className="absolute top-0 h-0.5 w-8 rounded-full bg-sky-400" /> : null}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
