import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

const lightTokens = {
  '--bg': '#FAF7F1',
  '--bg-card': '#FFFDF8',
  '--bg-input': 'rgba(255,255,255,0.72)',
  '--border': 'rgba(16,24,43,0.16)',
  '--border-focus': 'rgba(164,81,43,0.48)',
  '--text-primary': '#10182B',
  '--text-secondary': '#4F5666',
  '--text-muted': '#666D7C',
  '--text-hint': '#6D7380',
  '--shadow': 'rgba(16,24,43,0.08)',
  '--accent': '#A4512B',
  '--accent-bg': 'rgba(164,81,43,0.11)',
  '--accent-text': '#A4512B',
  '--slate': '#43556F',
  '--slate-bg': 'rgba(67,85,111,0.10)',
  '--red': '#A94740',
  '--amber': '#8F641F',
  '--green': '#3F6F50',
  '--blue': '#43556F'
}

const darkTokens = {
  '--bg': '#10182B',
  '--bg-card': '#17213A',
  '--bg-input': 'rgba(250,247,241,0.08)',
  '--border': 'rgba(250,247,241,0.16)',
  '--border-focus': 'rgba(222,175,146,0.46)',
  '--text-primary': '#FAF7F1',
  '--text-secondary': 'rgba(250,247,241,0.78)',
  '--text-muted': 'rgba(250,247,241,0.66)',
  '--text-hint': 'rgba(250,247,241,0.58)',
  '--shadow': 'rgba(0,0,0,0.34)',
  '--accent': '#DEAF92',
  '--accent-bg': 'rgba(222,175,146,0.13)',
  '--accent-text': '#DEAF92',
  '--slate': '#B3C0D1',
  '--slate-bg': 'rgba(179,192,209,0.12)',
  '--red': '#E09892',
  '--amber': '#E2B56F',
  '--green': '#A6C0AE',
  '--blue': '#B3C0D1'
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