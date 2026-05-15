'use client'

import { useEffect } from 'react'

const THEME_KEY = 'joblytics-theme'
const LANGUAGE_KEY = 'joblytics-language'

function applyTheme(value: string | null): void {
  const theme = value === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme
}

function applyLanguage(value: string | null): void {
  const language = value === 'fr' ? 'fr' : 'en'
  document.documentElement.lang = language
  document.documentElement.dataset.language = language
}

export function PreferencesProvider(): null {
  useEffect(() => {
    applyTheme(window.localStorage.getItem(THEME_KEY))
    applyLanguage(window.localStorage.getItem(LANGUAGE_KEY))

    function onStorage(event: StorageEvent): void {
      if (event.key === THEME_KEY) applyTheme(event.newValue)
      if (event.key === LANGUAGE_KEY) applyLanguage(event.newValue)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return null
}

export function setStoredTheme(theme: 'dark' | 'light'): void {
  window.localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

export function getStoredTheme(): 'dark' | 'light' {
  return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
}

export function setStoredLanguage(language: 'en' | 'fr'): void {
  window.localStorage.setItem(LANGUAGE_KEY, language)
  applyLanguage(language)
}

export function getStoredLanguage(): 'en' | 'fr' {
  return window.localStorage.getItem(LANGUAGE_KEY) === 'fr' ? 'fr' : 'en'
}
