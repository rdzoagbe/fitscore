import Link from 'next/link'

const items = [
  { href: '/dashboard', label: 'Home' },
  { href: '/tracker', label: 'Track' },
  { href: '/scanner', label: 'Scan' },
  { href: '/cv-enhancer', label: 'CV' },
  { href: '/more', label: 'More' }
]

export function MobileNav(): JSX.Element {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-xl border border-border bg-[var(--bg-input)] p-1 shadow-2xl lg:hidden">
      {items.map(item => (
        <Link key={item.href} href={item.href} className="focus-ring grid min-h-11 place-items-center rounded-md text-[10px] text-[var(--text-secondary)] hover:bg-elevated hover:text-accent">
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
