'use client'

import { useEffect } from 'react'

export type Theme = 'dark' | 'light'
export type Language = 'en' | 'fr' | 'de' | 'es' | 'pt' | 'it' | 'nl' | 'ar'

const THEME_KEY    = 'joblytics-theme'
const LANG_KEY     = 'joblytics-language'
const VALID_THEMES = new Set(['dark', 'light'])
const VALID_LANGS  = new Set(['en', 'fr', 'de', 'es', 'pt', 'it', 'nl', 'ar'])

function applyTheme(v: string | null): void {
  document.documentElement.dataset.theme = VALID_THEMES.has(v ?? '') ? (v as Theme) : 'dark'
}
function applyLang(v: string | null): void {
  const lang = VALID_LANGS.has(v ?? '') ? (v as Language) : 'en'
  document.documentElement.lang = lang
  document.documentElement.dataset.language = lang
}

export function PreferencesProvider(): null {
  useEffect(() => {
    applyTheme(localStorage.getItem(THEME_KEY))
    applyLang(localStorage.getItem(LANG_KEY))
    function onStorage(e: StorageEvent): void {
      if (e.key === THEME_KEY) applyTheme(e.newValue)
      if (e.key === LANG_KEY) applyLang(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return null
}

export function setStoredTheme(t: Theme): void { localStorage.setItem(THEME_KEY, t); applyTheme(t) }
export function getStoredTheme(): Theme {
  const v = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null
  return VALID_THEMES.has(v ?? '') ? (v as Theme) : 'dark'
}

export function setStoredLanguage(l: Language): void { localStorage.setItem(LANG_KEY, l); applyLang(l) }
export function getStoredLanguage(): Language {
  const v = typeof window !== 'undefined' ? localStorage.getItem(LANG_KEY) : null
  return VALID_LANGS.has(v ?? '') ? (v as Language) : 'en'
}
