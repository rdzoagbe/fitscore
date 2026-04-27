import React, { useState, useRef, useEffect } from 'react'
import { useLang } from '../context/LangContext'

export default function LangSelector({ inline = false }) {
  const { lang, changeLang, languages } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const current = languages.find(l => l.code === lang) || languages[0]

  // Inline mode: show all options as a grid
  if (inline) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
        {languages.map(l => (
          <button key={l.code} onClick={() => changeLang(l.code)} style={{
            padding: '6px 4px', borderRadius: 8,
            border: `1px solid ${lang===l.code?'var(--accent)':'var(--border)'}`,
            background: lang===l.code?'var(--accent-bg)':'var(--bg-input)',
            color: lang===l.code?'var(--accent)':'var(--text-muted)',
            cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: 16 }}>{l.flag}</span>
            <span style={{ fontSize: 9, fontWeight: lang===l.code?600:400 }}>{l.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    )
  }

  if (inline) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {languages.map(l => (
          <button key={l.code} onClick={() => changeLang(l.code)} style={{
            padding: '5px 10px', borderRadius: 20, border: `1px solid ${lang===l.code?'var(--accent)':'var(--border)'}`,
            background: lang===l.code?'var(--accent-bg)':'var(--bg-input)',
            color: lang===l.code?'var(--accent)':'var(--text-muted)',
            fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit'
          }}>
            <span>{l.flag}</span>
            <span style={{ fontWeight: lang===l.code?600:400 }}>{l.code.toUpperCase()}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit',
        transition: 'all 0.2s'
      }}>
        <span style={{ fontSize: 14 }}>{current.flag}</span>
        <span style={{ fontWeight: 500 }}>{current.code.toUpperCase()}</span>
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4, zIndex: 50,
          boxShadow: '0 8px 24px var(--shadow)', minWidth: 160,
          animation: 'fadeUp 0.15s ease'
        }}>
          {languages.map(l => (
            <button key={l.code} onClick={() => { changeLang(l.code); setOpen(false) }} style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
              background: lang===l.code?'var(--accent-bg)':'transparent',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: lang===l.code?'var(--accent)':'var(--text-primary)',
              fontFamily: 'inherit', transition: 'background 0.15s'
            }}
            onMouseEnter={e => { if (lang!==l.code) e.currentTarget.style.background='var(--bg-input)' }}
            onMouseLeave={e => { if (lang!==l.code) e.currentTarget.style.background='transparent' }}>
              <span style={{ fontSize: 16 }}>{l.flag}</span>
              <span>{l.label}</span>
              {lang===l.code && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
