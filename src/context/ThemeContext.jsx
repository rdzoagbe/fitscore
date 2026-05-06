import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('fitscore_theme') || 'dark')

  const getEffective = (t) => {
    if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return t
  }

  const [effective, setEffective] = useState(() => getEffective(localStorage.getItem('fitscore_theme') || 'dark'))

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') setEffective(getEffective('system'))
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme)
    localStorage.setItem('fitscore_theme', nextTheme)
    setEffective(getEffective(nextTheme))
  }

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = effective
    root.style.colorScheme = effective

    if (effective === 'dark') {
      root.style.setProperty('--bg', '#1A1B22')
      root.style.setProperty('--bg-card', '#23252E')
      root.style.setProperty('--bg-input', '#2A2C36')
      root.style.setProperty('--border', 'rgba(255,255,255,0.07)')
      root.style.setProperty('--border-focus', 'rgba(255,255,255,0.22)')
      root.style.setProperty('--text-primary', '#ECECEF')
      root.style.setProperty('--text-secondary', '#A8A8B5')
      root.style.setProperty('--text-muted', '#888896')
      root.style.setProperty('--text-hint', '#5A5A66')
      root.style.setProperty('--shadow', 'rgba(0,0,0,0.4)')
      root.style.setProperty('--accent', '#FF8E6B')
      root.style.setProperty('--accent-bg', 'rgba(255,142,107,0.12)')
      root.style.setProperty('--accent-text', '#FF8E6B')
      root.style.setProperty('--slate', '#8DA3BD')
      root.style.setProperty('--slate-bg', 'rgba(141,163,189,0.12)')
      root.style.setProperty('--pro-bg-top', '#15171e')
      root.style.setProperty('--pro-bg-mid', '#101116')
      root.style.setProperty('--pro-bg-bottom', '#0c0d11')
      root.style.setProperty('--pro-card', 'rgba(255,255,255,0.055)')
      root.style.setProperty('--pro-card-strong', 'rgba(255,255,255,0.075)')
      root.style.setProperty('--pro-card-soft', 'rgba(255,255,255,0.035)')
      root.style.setProperty('--pro-border', 'rgba(255,255,255,0.09)')
      root.style.setProperty('--pro-muted', 'rgba(247,243,238,0.62)')
      root.style.setProperty('--pro-faint', 'rgba(247,243,238,0.42)')
      root.style.setProperty('--pro-nav', 'rgba(18,19,25,0.82)')
    } else {
      root.style.setProperty('--bg', '#FAF7F2')
      root.style.setProperty('--bg-card', '#FFFFFF')
      root.style.setProperty('--bg-input', '#F2EEE8')
      root.style.setProperty('--border', 'rgba(60,55,80,0.08)')
      root.style.setProperty('--border-focus', 'rgba(60,55,80,0.25)')
      root.style.setProperty('--text-primary', '#2A2A35')
      root.style.setProperty('--text-secondary', '#5A5A66')
      root.style.setProperty('--text-muted', '#7A7A85')
      root.style.setProperty('--text-hint', '#A8A8B0')
      root.style.setProperty('--shadow', 'rgba(60,55,80,0.06)')
      root.style.setProperty('--accent', '#E07856')
      root.style.setProperty('--accent-bg', 'rgba(224,120,86,0.1)')
      root.style.setProperty('--accent-text', '#B5532E')
      root.style.setProperty('--slate', '#4B5D75')
      root.style.setProperty('--slate-bg', 'rgba(75,93,117,0.08)')
      root.style.setProperty('--pro-bg-top', '#fffaf4')
      root.style.setProperty('--pro-bg-mid', '#f7f0e7')
      root.style.setProperty('--pro-bg-bottom', '#efe7dc')
      root.style.setProperty('--pro-card', 'rgba(255,255,255,0.78)')
      root.style.setProperty('--pro-card-strong', 'rgba(255,255,255,0.92)')
      root.style.setProperty('--pro-card-soft', 'rgba(255,255,255,0.64)')
      root.style.setProperty('--pro-border', 'rgba(70,55,45,0.12)')
      root.style.setProperty('--pro-muted', 'rgba(42,42,53,0.66)')
      root.style.setProperty('--pro-faint', 'rgba(42,42,53,0.42)')
      root.style.setProperty('--pro-nav', 'rgba(255,250,244,0.84)')
    }
  }, [effective])

  return <ThemeContext.Provider value={{ theme, effective, changeTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
