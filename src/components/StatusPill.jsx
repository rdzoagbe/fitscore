import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'
import { trackEvent, analyticsEvents } from '../utils/analytics'

const STATUSES = [
  { value: null, key: 'status_not_applied', label: 'Not applied', icon: '○', color: 'var(--text-muted)', bg: 'var(--bg-input)' },
  { value: 'applied', key: 'status_applied', label: 'Applied', icon: '📨', color: '#7b8cff', bg: 'rgba(123,140,255,0.12)' },
  { value: 'interview', key: 'status_interview', label: 'Interview', icon: '💬', color: '#FF8E6B', bg: 'rgba(255,142,107,0.12)' },
  { value: 'technical_test', key: 'status_technical_test', label: 'Technical test', icon: '🧪', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { value: 'follow_up', key: 'status_follow_up', label: 'Follow-up', icon: '⏰', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  { value: 'offer', key: 'status_offer', label: 'Offer', icon: '🎉', color: '#4caf7d', bg: 'rgba(76,175,125,0.12)' },
  { value: 'rejected', key: 'status_rejected', label: 'Rejected', icon: '✗', color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)' },
  { value: 'withdrawn', key: 'status_withdrawn', label: 'Withdrawn', icon: '↩', color: '#8DA3BD', bg: 'rgba(141,163,189,0.12)' }
]

export default function StatusPill({ analysis, onUpdate, compact = false }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const current = STATUSES.find(s => s.value === (analysis.application_status || null)) || STATUSES[0]

  const setStatus = async (newStatus) => {
    setUpdating(true)
    setOpen(false)
    const updatedAt = new Date().toISOString()
    try {
      const { error } = await supabase
        .from('analyses')
        .update({ application_status: newStatus, status_updated_at: updatedAt })
        .eq('id', analysis.id)
      if (!error && onUpdate) onUpdate({ ...analysis, application_status: newStatus, status_updated_at: updatedAt })
      if (!error) trackEvent(analyticsEvents.APPLICATION_STATUS_CHANGED, { status: newStatus || 'not_applied' })
    } catch (e) {
      console.error('Status update error:', e.message)
    }
    setUpdating(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} disabled={updating} style={{
        background: current.bg,
        border: `1px solid ${current.color}40`,
        borderRadius: 20, padding: compact ? '2px 8px' : '3px 10px',
        cursor: 'pointer',
        fontSize: compact ? 10 : 11, fontWeight: 600, color: current.color,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: compact ? 10 : 11 }}>{current.icon}</span>
        <span>{t(current.key) || current.label}</span>
        <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, zIndex: 30,
          minWidth: 178, boxShadow: '0 8px 24px var(--shadow)',
          animation: 'fadeUp 0.15s ease'
        }}>
          {STATUSES.map(s => {
            const isActive = s.value === (analysis.application_status || null)
            return (
              <button key={s.key} onClick={() => setStatus(s.value)} style={{
                width: '100%', textAlign: 'left',
                padding: '7px 10px', borderRadius: 7,
                background: isActive ? s.bg : 'transparent',
                border: 'none', cursor: 'pointer',
                fontSize: 12, color: isActive ? s.color : 'var(--text-primary)',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-input)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 13 }}>{s.icon}</span>
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{t(s.key) || s.label}</span>
                {isActive && <span style={{ marginLeft: 'auto', color: s.color }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
