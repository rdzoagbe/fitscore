import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

// Hero panel showing personalized welcome + quick stats
export default function AnalyzerHero() {
  const { user } = useAuth()
  const { t } = useLang()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('analyses')
          .select('score, application_status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) throw error
        if (!data || data.length === 0) {
          setStats({ count: 0, avg: 0, best: 0, applied: 0, isNew: true })
        } else {
          const count = data.length
          const avg = Math.round(data.reduce((sum, a) => sum + (a.score || 0), 0) / count)
          const best = Math.max(...data.map(a => a.score || 0))
          const applied = data.filter(a => a.application_status && a.application_status !== 'rejected' && a.application_status !== 'withdrawn').length
          // Trend: avg of last 5 vs avg of previous 5
          let trend = null
          if (count >= 6) {
            const recent5 = data.slice(0, 5)
            const prev5 = data.slice(5, 10)
            if (prev5.length >= 3) {
              const recentAvg = recent5.reduce((s, a) => s + (a.score || 0), 0) / recent5.length
              const prevAvg = prev5.reduce((s, a) => s + (a.score || 0), 0) / prev5.length
              trend = Math.round(recentAvg - prevAvg)
            }
          }
          setStats({ count, avg, best, applied, trend, isNew: false })
        }
      } catch (e) {
        console.error('Stats error:', e.message)
      }
      setLoading(false)
    })()
  }, [user])

  const firstName = (user?.email || 'there').split('@')[0].split('.')[0]
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'greet_morning' : hour < 18 ? 'greet_afternoon' : 'greet_evening'
  const greeting = t(greetingKey) || (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')

  if (loading) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 8, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 8 }} />
      </div>
    )
  }

  // Brand new user — just a warm welcome, no stats yet
  if (stats?.isNew) {
    return (
      <div style={{ marginBottom: 28, animation: 'fadeUp 0.4s ease' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(22px,4.5vw,28px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          {greeting}, {displayName} <span style={{ display: 'inline-block', animation: 'wave 1.5s ease-in-out 0.5s' }}>👋</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('hero_first_time') || "Let's run your first analysis. Paste a job URL or description below and we'll see how your CV measures up."}
        </p>
      </div>
    )
  }

  // Returning user — show stats
  const trendColor = stats.trend > 0 ? '#4caf7d' : stats.trend < 0 ? '#ff6b6b' : 'var(--text-muted)'
  const avgColor = stats.avg >= 70 ? '#4caf7d' : stats.avg >= 50 ? '#f5a623' : '#ff6b6b'

  return (
    <div style={{ marginBottom: 28, animation: 'fadeUp 0.4s ease' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(22px,4.5vw,28px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 14 }}>
        {greeting}, {displayName} <span style={{ display: 'inline-block', animation: 'wave 1.5s ease-in-out 0.5s' }}>👋</span>
      </h1>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,140px), 1fr))', gap: 8 }}>
        <Stat label={t('stat_analyses') || 'Analyses'} value={stats.count} />
        <Stat label={t('stat_avg_score') || 'Avg score'} value={`${stats.avg}%`} color={avgColor} trend={stats.trend} trendColor={trendColor} />
        <Stat label={t('stat_best_score') || 'Best score'} value={`${stats.best}%`} color="#4caf7d" />
        {stats.applied > 0 && <Stat label={t('stat_applied') || 'Applied'} value={stats.applied} icon="📨" />}
      </div>
    </div>
  )
}

function Stat({ label, value, color, trend, trendColor, icon }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {icon ? `${icon} ` : ''}{label}
        </p>
        {trend !== null && trend !== undefined && trend !== 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: trendColor }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color || 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  )
}
