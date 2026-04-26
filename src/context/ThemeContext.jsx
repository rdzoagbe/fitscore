import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  // Default to LIGHT
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
    if (effective === 'dark') {
      root.style.setProperty('--bg', '#0f0f0f')
      root.style.setProperty('--bg-card', '#181818')
      root.style.setProperty('--bg-input', '#1f1f1f')
      root.style.setProperty('--border', 'rgba(255,255,255,0.07)')
      root.style.setProperty('--border-focus', 'rgba(255,255,255,0.22)')
      root.style.setProperty('--text-primary', '#f0f0f0')
      root.style.setProperty('--text-secondary', '#a8a8a8')
      root.style.setProperty('--text-muted', '#777')
      root.style.setProperty('--text-hint', '#555')
      root.style.setProperty('--shadow', 'rgba(0,0,0,0.4)')
      root.style.setProperty('--accent', '#c8f542')
      root.style.setProperty('--accent-bg', 'rgba(200,245,66,0.1)')
    } else {
      root.style.setProperty('--bg', '#fafafa')
      root.style.setProperty('--bg-card', '#ffffff')
      root.style.setProperty('--bg-input', '#f0f0f0')
      root.style.setProperty('--border', 'rgba(0,0,0,0.08)')
      root.style.setProperty('--border-focus', 'rgba(0,0,0,0.25)')
      root.style.setProperty('--text-primary', '#111111')
      root.style.setProperty('--text-secondary', '#555555')
      root.style.setProperty('--text-muted', '#888888')
      root.style.setProperty('--text-hint', '#aaaaaa')
      root.style.setProperty('--shadow', 'rgba(0,0,0,0.08)')
      root.style.setProperty('--accent', '#8aaa28')
      root.style.setProperty('--accent-bg', 'rgba(138,170,40,0.1)')
    }
  }, [effective])

  return <ThemeContext.Provider value={{ theme, effective, changeTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
