'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  getStoredTheme, setStoredTheme,
  getStoredLanguage, setStoredLanguage,
  type Theme, type Language,
} from '@/components/system/PreferencesProvider'

/* ── SVG icon helper ─────────────────────────────────────── */
function Ico({ d, size = 16 }: { readonly d: string; readonly size?: number }): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size} aria-hidden>
      <path d={d} />
    </svg>
  )
}

/* ── Icon paths ──────────────────────────────────────────── */
const ic = {
  analyze:     'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  tracker:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  coverLetter: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  interview:   'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  linkedin:    'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  cv:          'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  analytics:   'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  exportIpr:   'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  settings:    'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  chevDown:    'M19 9l-7 7-7-7',
  sun:         'M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 100 10A5 5 0 0012 7z',
  moon:        'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  globe:       'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
  menu:        'M4 6h16M4 12h16M4 18h16',
  x:           'M6 18L18 6M6 6l12 12',
  logout:      'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
} as const

type IconKey = keyof typeof ic

/* ── Nav data ────────────────────────────────────────────── */
type NavItem = { href: string; label: string; icon: IconKey }

const mainItems: NavItem[] = [
  { href: '/scanner', label: 'Analyze',  icon: 'analyze' },
  { href: '/tracker', label: 'Tracker',  icon: 'tracker' },
]
const toolItems: NavItem[] = [
  { href: '/cover-letters', label: 'Cover Letters',  icon: 'coverLetter' },
  { href: '/interview',     label: 'Interview Prep', icon: 'interview' },
  { href: '/linkedin',      label: 'LinkedIn',       icon: 'linkedin' },
  { href: '/cv-enhancer',   label: 'CV Manager',     icon: 'cv' },
]
const reportItems: NavItem[] = [
  { href: '/analytics',  label: 'Analytics',    icon: 'analytics' },
  { href: '/export-ipr', label: 'Export / IPR', icon: 'exportIpr' },
]

/* ── Language data ─────────────────────────────────────────── */
const langs: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
]

/* ── Nav link ────────────────────────────────────────────── */
function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }): JSX.Element {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
      }`}
    >
      <Ico d={ic[item.icon]} />
      <span>{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
    </Link>
  )
}

function Label({ children }: { readonly children: string }): JSX.Element {
  return (
    <p className="mb-1 mt-5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
      {children}
    </p>
  )
}

/* ── Inner content (shared) ──────────────────────────────────── */
function Content({ userName, userEmail, pathname, onClose }: {
  readonly userName: string
  readonly userEmail: string
  readonly pathname: string
  readonly onClose?: () => void
}): JSX.Element {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [lang, setLangState] = useState<Language>('en')
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setThemeState(getStoredTheme())
    setLangState(getStoredLanguage())
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent): void {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggleTheme(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setThemeState(next)
    setStoredTheme(next)
  }

  function pickLang(code: Language): void {
    setLangState(code)
    setStoredLanguage(code)
    setLangOpen(false)
  }

  const currentLang = langs.find(l => l.code === lang) ?? langs[0]!
  const initials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 pb-4 pt-5">
      {/* Logo */}
      <Link href="/scanner" className="mb-7 flex items-center gap-2.5 px-1" onClick={onClose}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white">
          J
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">Joblytics</p>
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">AI Cockpit</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {mainItems.map(item => <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />)}
        <Label>Tools</Label>
        {toolItems.map(item => <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />)}
        <Label>Reports</Label>
        {reportItems.map(item => <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />)}
      </nav>

      <div className="flex-1" />

      {/* Bottom */}
      <div className="mt-4 space-y-0.5 border-t border-[var(--border)] pt-4">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
        >
          <Ico d={ic.settings} />
          <span>Settings</span>
        </Link>

        <div className="flex items-center gap-1 pt-1">
          {/* Theme */}
          <button type="button" onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-white/5 hover:text-[var(--text-secondary)]"
          >
            <Ico d={theme === 'dark' ? ic.sun : ic.moon} size={15} />
          </button>

          {/* Language */}
          <div className="relative flex-1" ref={langRef}>
            <button type="button" onClick={() => setLangOpen(v => !v)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              <Ico d={ic.globe} size={13} />
              <span className="truncate">{currentLang.flag} {currentLang.name}</span>
              <Ico d={ic.chevDown} size={11} />
            </button>

            {langOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-48 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {langs.map(l => (
                  <button key={l.code} type="button" onClick={() => pickLang(l.code)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition hover:bg-white/5 ${
                      l.code === lang ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="text-sm leading-none">{l.flag}</span>
                    <span>{l.name}</span>
                    {l.code === lang && <span className="ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User row */}
        <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{userName}</p>
            <p className="truncate text-[10px] text-[var(--text-muted)]">{userEmail}</p>
          </div>
          <button
            type="button"
            title="Sign out"
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client')
              await createClient().auth.signOut()
              window.location.replace('/login?logged_out=1')
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
          >
            <Ico d={ic.logout} size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Public export ───────────────────────────────────────────── */
export function Sidebar({ userName, userEmail }: { readonly userName: string; readonly userEmail: string }): JSX.Element {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = (): void => setMobileOpen(false)

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] lg:flex">
        <Content userName={userName} userEmail={userEmail} pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)]/95 px-4 backdrop-blur-md lg:hidden">
        <Link href="/scanner" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--accent)] text-xs font-bold text-white">J</div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Joblytics</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-[var(--text-secondary)] transition hover:bg-white/5"
        >
          <Ico d={ic.menu} size={18} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" onClick={close} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] lg:hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold">Joblytics AI</span>
              <button type="button" onClick={close} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/5">
                <Ico d={ic.x} size={16} />
              </button>
            </div>
            <Content userName={userName} userEmail={userEmail} pathname={pathname} onClose={close} />
          </aside>
        </>
      )}
    </>
  )
}
