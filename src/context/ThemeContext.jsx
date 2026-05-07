import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})
const DEFAULT_THEME = 'light'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('fitscore_theme') || DEFAULT_THEME)

  const getEffective = (t) => {
    if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    return t
  }

  const [effective, setEffective] = useState(() => getEffective(localStorage.getItem('fitscore_theme') || DEFAULT_THEME))

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
      root.style.setProperty('--bg', '#0B1120')
      root.style.setProperty('--bg-soft', '#0F172A')
      root.style.setProperty('--bg-card', '#111827')
      root.style.setProperty('--bg-elevated', '#172033')
      root.style.setProperty('--bg-input', '#151F32')
      root.style.setProperty('--bg-muted', '#1E293B')
      root.style.setProperty('--border', '#25324A')
      root.style.setProperty('--border-soft', '#1F2A3D')
      root.style.setProperty('--border-focus', '#60A5FA')
      root.style.setProperty('--text-primary', '#F8FAFC')
      root.style.setProperty('--text-secondary', '#CBD5E1')
      root.style.setProperty('--text-muted', '#94A3B8')
      root.style.setProperty('--text-hint', '#64748B')
      root.style.setProperty('--text-inverse', '#0F172A')
      root.style.setProperty('--shadow', 'rgba(0,0,0,0.32)')
      root.style.setProperty('--shadow-sm', '0 1px 2px rgba(0,0,0,0.24)')
      root.style.setProperty('--shadow-md', '0 10px 28px rgba(0,0,0,0.28)')
      root.style.setProperty('--shadow-lg', '0 24px 70px rgba(0,0,0,0.36)')
      root.style.setProperty('--accent', '#60A5FA')
      root.style.setProperty('--accent-hover', '#3B82F6')
      root.style.setProperty('--accent-pressed', '#2563EB')
      root.style.setProperty('--accent-bg', 'rgba(96,165,250,0.14)')
      root.style.setProperty('--accent-soft', 'rgba(96,165,250,0.14)')
      root.style.setProperty('--accent-ring', 'rgba(96,165,250,0.28)')
      root.style.setProperty('--accent-text', '#93C5FD')
      root.style.setProperty('--brand-orange', '#FF9B72')
      root.style.setProperty('--brand-orange-soft', 'rgba(255,155,114,0.12)')
      root.style.setProperty('--slate', '#94A3B8')
      root.style.setProperty('--slate-bg', 'rgba(148,163,184,0.12)')
      root.style.setProperty('--red', '#EF4444')
      root.style.setProperty('--amber', '#F59E0B')
      root.style.setProperty('--green', '#22C55E')
      root.style.setProperty('--blue', '#60A5FA')
      root.style.setProperty('--success', '#22C55E')
      root.style.setProperty('--success-soft', 'rgba(34,197,94,0.14)')
      root.style.setProperty('--warning', '#F59E0B')
      root.style.setProperty('--warning-soft', 'rgba(245,158,11,0.16)')
      root.style.setProperty('--danger', '#EF4444')
      root.style.setProperty('--danger-soft', 'rgba(239,68,68,0.14)')
      root.style.setProperty('--pro-bg-top', '#0B1120')
      root.style.setProperty('--pro-bg-mid', '#0F172A')
      root.style.setProperty('--pro-bg-bottom', '#080D18')
      root.style.setProperty('--pro-card', 'rgba(17,24,39,0.82)')
      root.style.setProperty('--pro-card-strong', 'rgba(23,32,51,0.92)')
      root.style.setProperty('--pro-card-soft', 'rgba(15,23,42,0.68)')
      root.style.setProperty('--pro-border', 'rgba(148,163,184,0.18)')
      root.style.setProperty('--pro-muted', 'rgba(203,213,225,0.72)')
      root.style.setProperty('--pro-faint', 'rgba(148,163,184,0.52)')
      root.style.setProperty('--pro-nav', 'rgba(11,17,32,0.86)')
    } else {
      root.style.setProperty('--bg', '#F6F8FB')
      root.style.setProperty('--bg-soft', '#F8FAFC')
      root.style.setProperty('--bg-card', '#FFFFFF')
      root.style.setProperty('--bg-elevated', '#FFFFFF')
      root.style.setProperty('--bg-input', '#F8FAFC')
      root.style.setProperty('--bg-muted', '#EEF2F7')
      root.style.setProperty('--border', '#D9E2EC')
      root.style.setProperty('--border-soft', '#E5EDF5')
      root.style.setProperty('--border-focus', '#2563EB')
      root.style.setProperty('--text-primary', '#0F172A')
      root.style.setProperty('--text-secondary', '#475569')
      root.style.setProperty('--text-muted', '#64748B')
      root.style.setProperty('--text-hint', '#94A3B8')
      root.style.setProperty('--text-inverse', '#FFFFFF')
      root.style.setProperty('--shadow', 'rgba(15,23,42,0.08)')
      root.style.setProperty('--shadow-sm', '0 1px 2px rgba(15,23,42,0.06)')
      root.style.setProperty('--shadow-md', '0 8px 24px rgba(15,23,42,0.08)')
      root.style.setProperty('--shadow-lg', '0 20px 60px rgba(15,23,42,0.12)')
      root.style.setProperty('--accent', '#2563EB')
      root.style.setProperty('--accent-hover', '#1D4ED8')
      root.style.setProperty('--accent-pressed', '#1E40AF')
      root.style.setProperty('--accent-bg', '#DBEAFE')
      root.style.setProperty('--accent-soft', '#DBEAFE')
      root.style.setProperty('--accent-ring', 'rgba(37,99,235,0.24)')
      root.style.setProperty('--accent-text', '#1D4ED8')
      root.style.setProperty('--brand-orange', '#FF8A5F')
      root.style.setProperty('--brand-orange-soft', 'rgba(255,138,95,0.12)')
      root.style.setProperty('--slate', '#475569')
      root.style.setProperty('--slate-bg', 'rgba(71,85,105,0.09)')
      root.style.setProperty('--red', '#DC2626')
      root.style.setProperty('--amber', '#F59E0B')
      root.style.setProperty('--green', '#16A34A')
      root.style.setProperty('--blue', '#2563EB')
      root.style.setProperty('--success', '#16A34A')
      root.style.setProperty('--success-soft', '#DCFCE7')
      root.style.setProperty('--warning', '#F59E0B')
      root.style.setProperty('--warning-soft', '#FEF3C7')
      root.style.setProperty('--danger', '#DC2626')
      root.style.setProperty('--danger-soft', '#FEE2E2')
      root.style.setProperty('--pro-bg-top', '#F8FAFC')
      root.style.setProperty('--pro-bg-mid', '#F1F5F9')
      root.style.setProperty('--pro-bg-bottom', '#EAF1F9')
      root.style.setProperty('--pro-card', 'rgba(255,255,255,0.82)')
      root.style.setProperty('--pro-card-strong', 'rgba(255,255,255,0.96)')
      root.style.setProperty('--pro-card-soft', 'rgba(255,255,255,0.70)')
      root.style.setProperty('--pro-border', 'rgba(15,23,42,0.10)')
      root.style.setProperty('--pro-muted', 'rgba(71,85,105,0.78)')
      root.style.setProperty('--pro-faint', 'rgba(100,116,139,0.58)')
      root.style.setProperty('--pro-nav', 'rgba(255,255,255,0.86)')
    }
  }, [effective])

  return <ThemeContext.Provider value={{ theme, effective, changeTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
