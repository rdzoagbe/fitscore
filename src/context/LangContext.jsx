import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, LANGUAGES } from '../i18n/translations'
import { extraTranslations } from '../i18n/appTranslations'

const LangContext = createContext({})

function mergeTranslations(base, extra) {
  const merged = { ...base }
  Object.keys(extra || {}).forEach(lang => {
    merged[lang] = { ...(base[lang] || base.en || {}), ...(extra[lang] || {}) }
  })
  return merged
}

const allTranslations = mergeTranslations(translations, extraTranslations)

function formatTemplate(value, params = {}) {
  if (typeof value !== 'string') return value
  return value.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('fitscore_lang')
    if (saved && allTranslations[saved]) return saved
    const browser = navigator.language?.split('-')[0]
    if (browser && allTranslations[browser]) return browser
    return 'en'
  })

  const changeLang = (l) => {
    setLang(l)
    localStorage.setItem('fitscore_lang', l)
  }

  const t = (key, paramsOrFallback, fallbackValue) => {
    const hasParams = paramsOrFallback && typeof paramsOrFallback === 'object' && !Array.isArray(paramsOrFallback)
    const params = hasParams ? paramsOrFallback : {}
    const fallback = hasParams ? fallbackValue : paramsOrFallback
    const value = allTranslations[lang]?.[key] || allTranslations.en?.[key] || fallback || key
    return formatTemplate(value, params)
  }

  return <LangContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)