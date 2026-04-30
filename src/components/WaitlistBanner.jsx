import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LangContext'

export default function WaitlistBanner({ rateLimit }) {
  const { t } = useLang()
  const { user } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!rateLimit) return null
  const { dayCount = 0, dayLimit = 50 } = rateLimit
  // Only show when user is at 80%+ of daily limit
  const ratio = dayCount / dayLimit
  if (ratio < 0.8) return null

  const remaining = Math.max(0, dayLimit - dayCount)
  const reachedLimit = remaining === 0

  const join = async () => {
    if (!user) return
    setLoading(true)
    try {
      await supabase.from('waitlist').upsert({ user_id: user.id, email: user.email }, { onConflict: 'user_id' })
      setSubmitted(true)
    } catch (e) {
      console.warn('Waitlist error:', e.message)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div style={{ background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.3)', borderRadius: 14, padding: '14px 16px', marginBottom: 14, animation: 'fadeUp 0.3s ease' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#4caf7d', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ {t('waitlist_thanks') || "You're on the list — we'll email you when unlimited is available."}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: reachedLimit ? 'rgba(255,107,107,0.08)' : 'rgba(245,166,35,0.08)',
      border: `1px solid ${reachedLimit ? 'rgba(255,107,107,0.3)' : 'rgba(245,166,35,0.3)'}`,
      borderRadius: 14, padding: '14px 16px', marginBottom: 14, animation: 'fadeUp 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{reachedLimit ? '🚫' : '⏳'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: reachedLimit ? '#ff7878' : '#f5a623', marginBottom: 4 }}>
            {reachedLimit
              ? (t('waitlist_limit_reached') || 'Daily limit reached')
              : `${t('waitlist_almost_at_limit') || 'Almost at your daily limit'} · ${remaining} ${t('waitlist_left') || 'left'}`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
            {t('waitlist_pitch') || "Want unlimited analyses + cover letters? Get notified when our Pro plan launches."}
          </p>
          <button onClick={join} disabled={loading} style={{
            background: 'var(--accent)', color: '#1A1B22', border: 'none',
            padding: '6px 14px', borderRadius: 16, fontSize: 12, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', fontFamily: 'Syne, sans-serif'
          }}>
            {loading ? '...' : (t('waitlist_join') || 'Get notified →')}
          </button>
        </div>
      </div>
    </div>
  )
}
