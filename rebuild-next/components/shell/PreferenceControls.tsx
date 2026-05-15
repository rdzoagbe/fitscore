'use client'

import { useEffect, useState } from 'react'
import type { Language } from '@/components/system/PreferencesProvider'
import { getStoredLanguage, getStoredTheme, setStoredLanguage, setStoredTheme } from '@/components/system/PreferencesProvider'

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
  { value: 'de', label: 'DE' },
  { value: 'es', label: 'ES' },
  { value: 'pt', label: 'PT' },
  { value: 'it', label: 'IT' },
  { value: 'nl', label: 'NL' },
  { value: 'ar', label: 'AR' },
]

const VALID_LANGS = new Set<string>(LANGS.map(l => l.value))

export function PreferenceControls(): JSX.Element {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    setTheme(getStoredTheme())
    setLanguage(getStoredLanguage())
  }, [])

  function toggleTheme(): void {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    setStoredTheme(nextTheme)
  }

  function changeLanguage(val: string): void {
    if (!VALID_LANGS.has(val)) return
    const lang = val as Language
    setLanguage(lang)
    setStoredLanguage(lang)
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggleTheme} className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
      <label className="sr-only" htmlFor="language-select">Language</label>
      <select id="language-select" value={language} onChange={e => changeLanguage(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-[var(--text-secondary)] outline-none transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
        {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>
    </div>
  )
}
