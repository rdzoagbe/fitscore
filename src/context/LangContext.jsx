import React, { createContext, useContext, useState } from 'react'
import { translations, LANGUAGES } from '../i18n/translations'
import { premiumTranslations } from '../i18n/premiumTranslations'

const LangContext = createContext({})

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('fitscore_lang')
    if (saved && translations[saved]) return saved
    const browser = navigator.language?.split('-')[0]
    if (browser && translations[browser]) return browser
    return 'en'
  })

  const changeLang = (l) => {
    setLang(l)
    localStorage.setItem('fitscore_lang', l)
    document.documentElement.lang = l
  }

  const t = (key) => (
    translations[lang]?.[key] ||
    premiumTranslations[lang]?.[key] ||
    translations.en?.[key] ||
    premiumTranslations.en?.[key] ||
    key
  )

  return <LangContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
