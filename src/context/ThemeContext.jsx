import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

const lightTokens = {
  '--bg': '#FAF7F1',
  '--bg-card': '#FFFDF8',
  '--bg-input': 'rgba(255,255,255,0.68)',
  '--border': 'rgba(16,24,43,0.12)',
  '--border-focus': 'rgba(181,102,60,0.38)',
  '--text-primary': '#10182B',
  '--text-secondary': '#5F6472',
  '--text-muted': '#7A7F8C',
  '--text-hint': 'rgba(95,100,114,0.72)',
  '--shadow': 'rgba(16,24,43,0.08)',
  '--accent': '#B5663C',
  '--accent-bg': 'rgba(181,102,60,0.10)',
  '--accent-text': '#B5663C',
  '--slate': '#516483',
  '--slate-bg': 'rgba(81,100,131,0.09)',
  '--red': '#B85C55',
  '--amber': '#B9863B',
  '--green': '#557C64',
  '--blue': '#516483'
}

const darkTokens = {
  '--bg': '#10182B',
  '--bg-card': '#17213A',
  '--bg-input': 'rgba(250,247,241,0.08)',
  '--border': 'rgba(250,247,241,0.13)',
  '--border-focus': 'rgba(214,161,129,0.42)',
  '--text-primary': '#FAF7F1',
  '--text-secondary': 'rgba(250,247,241,0.72)',
  '--text-muted': 'rgba(250,247,241,0.56)',
  '--text-hint': 'rgba(250,247,241,0.38)',
  '--shadow': 'rgba(0,0,0,0.34)',
  '--accent': '#D6A181',
  '--accent-bg': 'rgba(214,161,129,0.12)',
  '--accent-text': '#D6A181',
  '--slate': '#9BA9BD',
  '--slate-bg': 'rgba(155,169,189,0.12)',
  '--red': '#D8847E',
  '--amber': '#D6A35B',
  '--green': '#8EA996',
  '--blue': '#9BA9BD'
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
