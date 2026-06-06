import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

const lightTokens = {
  '--bg': '#EEE2DC',
  '--bg-card': '#F8F0EC',
  '--bg-input': 'rgba(255,255,255,0.68)',
  '--border': 'rgba(18,60,105,0.14)',
  '--border-focus': 'rgba(172,59,97,0.48)',
  '--text-primary': '#123C69',
  '--text-secondary': '#5C556A',
  '--text-muted': '#8A8492',
  '--text-hint': '#A09AA8',
  '--shadow': 'rgba(18,60,105,0.08)',
  '--accent': '#AC3B61',
  '--accent-bg': 'rgba(172,59,97,0.10)',
  '--accent-text': '#AC3B61',
  '--slate': '#123C69',
  '--slate-bg': 'rgba(18,60,105,0.10)',
  '--red': '#A94740',
  '--amber': '#8F641F',
  '--green': '#3F6F50',
  '--blue': '#123C69'
}

const darkTokens = {
  '--bg': '#0A1D33',
  '--bg-card': '#112441',
  '--bg-input': 'rgba(238,226,220,0.08)',
  '--border': 'rgba(238,226,220,0.16)',
  '--border-focus': 'rgba(172,59,97,0.50)',
  '--text-primary': '#EEE2DC',
  '--text-secondary': 'rgba(238,226,220,0.76)',
  '--text-muted': 'rgba(238,226,220,0.60)',
  '--text-hint': 'rgba(238,226,220,0.50)',
  '--shadow': 'rgba(0,0,0,0.40)',
  '--accent': '#EDC7B7',
  '--accent-bg': 'rgba(237,199,183,0.12)',
  '--accent-text': '#EDC7B7',
  '--slate': '#BAB2B5',
  '--slate-bg': 'rgba(186,178,181,0.12)',
  '--red': '#E09892',
  '--amber': '#E2B56F',
  '--green': '#A6C0AE',
  '--blue': '#BAB2B5'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('fitscore_theme') || 'light')

  const getEffective = (t) => {
    if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return t
  }

  const [effective, setEffective] = useState(() => getEffective(localStorage.getItem('fitscore_theme') || 'light'))

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (theme === 'system') setEffective(getEffective('system')) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const changeTheme = (t) => {
    setTheme(t)
    localStorage.setItem('fitscore_theme', t)
    setEffective(getEffective(t))
  }

  useEffect(() => {
    const root = document.documentElement
    const tokens = effective === 'dark' ? darkTokens : lightTokens
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value))
    root.dataset.theme = effective
  }, [effective])

  return <ThemeContext.Provider value={{ theme, effective, changeTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)