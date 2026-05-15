'use client'

import { useEffect, useState } from 'react'
import { getStoredLanguage, getStoredTheme, setStoredLanguage, setStoredTheme } from '@/components/system/PreferencesProvider'

export function PreferenceControls(): JSX.Element {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [language, setLanguage] = useState<'en' | 'fr'>('en')

  useEffect(() => {
    setTheme(getStoredTheme())
    setLanguage(getStoredLanguage())
  }, [])

  function toggleTheme(): void {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    setStoredTheme(nextTheme)
  }

  function changeLanguage(nextLanguage: 'en' | 'fr'): void {
    setLanguage(nextLanguage)
    setStoredLanguage(nextLanguage)
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggleTheme} className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
      <label className="sr-only" htmlFor="language-select">Language</label>
      <select id="language-select" value={language} onChange={event => changeLanguage(event.target.value === 'fr' ? 'fr' : 'en')} className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-[var(--text-secondary)] outline-none transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
        <option value="en">EN</option>
        <option value="fr">FR</option>
      </select>
    </div>
  )
}
