import React, { useState } from 'react'
import { useLang } from '../context/LangContext'

function QuickWinItem({ win, index }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  // Handle both old format (string) and new format (object)
  const tip = typeof win === 'string' ? win : win.tip
  const example = typeof win === 'string' ? null : win.example

  const handleCopy = (e) => {
    e.stopPropagation()
    if (!example) return
    navigator.clipboard.writeText(example)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1B22', fontFamily: 'Syne, sans-serif' }}>{index + 1}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0, flex: 1, fontWeight: 500 }}>{tip}</p>
      </div>

      {/* Example sentence */}
      {example && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '10px 12px', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t('example') || 'Example'}
            </span>
            <button onClick={handleCopy} style={{
              background: copied ? 'rgba(76,175,125,0.15)' : 'var(--bg-input)',
              border: `1px solid ${copied ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
              borderRadius: 16, padding: '3px 9px', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, color: copied ? '#4caf7d' : 'var(--text-secondary)',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4
            }}>
              {copied ? '✓ ' + (t('copied') || 'Copied') : '📋 ' + (t('copy') || 'Copy')}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            "{example}"
          </p>
        </div>
      )}
    </div>
  )
}

export default function QuickWinsCard({ wins }) {
  const { t } = useLang()
  if (!wins || wins.length === 0) return null

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
        ✏️ {t('quick_wins')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 8 }}>
        {wins.map((w, i) => <QuickWinItem key={i} win={w} index={i} />)}
      </div>
    </div>
  )
}
