import React, { useEffect, useState } from 'react'
import { useLang } from '../context/LangContext'

// "Your journey" hero — progress-focused dashboard intro that shows momentum
// instead of just stats. Helps users see job hunting as progress, not paperwork.
export default function JourneyHero({ analyses }) {
  const { t } = useLang()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!analyses || analyses.length === 0) {
      setStats(null)
      return
    }

    const now = Date.now()
    const day = 86400000
    const week = day * 7

    // Sort by date for streak calc
    const sorted = [...analyses].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    // This week vs last week
    const thisWeek = analyses.filter(a => now - new Date(a.created_at).getTime() < week).length
    const lastWeek = analyses.filter(a => {
      const t = now - new Date(a.created_at).getTime()
      return t >= week && t < week * 2
    }).length

    // Best week (count per week, find max)
    const weekCounts = {}
    analyses.forEach(a => {
      const wk = Math.floor(new Date(a.created_at).getTime() / week)
      weekCounts[wk] = (weekCounts[wk] || 0) + 1
    })
    const bestWeek = Object.values(weekCounts).reduce((m, v) => Math.max(m, v), 0)

    // Streak — consecutive days with at least one analysis (counting back from today)
    const dayBuckets = new Set()
    analyses.forEach(a => {
      const d = new Date(a.created_at)
      d.setHours(0, 0, 0, 0)
      dayBuckets.add(d.getTime())
    })
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let cursor = today.getTime()
    while (dayBuckets.has(cursor)) {
      streak++
      cursor -= day
    }

    // Status counts
    const applied = analyses.filter(a => a.application_status && !['rejected', 'withdrawn', null, ''].includes(a.application_status)).length
    const interviewing = analyses.filter(a => ['interview', 'offer'].includes(a.application_status)).length

    setStats({
      total: analyses.length,
      thisWeek,
      lastWeek,
      bestWeek,
      streak,
      applied,
      interviewing,
      avgScore: Math.round(analyses.reduce((s, a) => s + (a.score || 0), 0) / analyses.length)
    })
  }, [analyses])

  if (!stats) return null

  const trend = stats.thisWeek - stats.lastWeek
  const trendColor = trend > 0 ? '#4caf7d' : trend < 0 ? '#ff8e6b' : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 18, padding: 'clamp(18px,4vw,24px)',
      marginBottom: 18, position: 'relative', overflow: 'hidden',
      animation: 'fadeUp 0.4s ease'
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'var(--accent-bg)', filter: 'blur(60px)', opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          📈 {t('journey_kicker') || 'Your journey'}
        </p>

        {stats.streak > 0 ? (
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(20px,4.5vw,26px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            🔥 {stats.streak} {stats.streak === 1 ? (t('day_streak') || 'day streak') : (t('days_streak') || 'days in a row')}
          </h2>
        ) : (
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(20px,4.5vw,26px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {stats.total} {t('analyses_total') || 'analyses'} · {stats.applied} {t('applications_total') || 'applications'}
          </h2>
        )}

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          {trend > 0
            ? `${t('journey_up_msg') || 'Up'} ${trend} ${t('vs_last_week') || 'vs last week'} 💪`
            : trend < 0
              ? `${Math.abs(trend)} ${t('journey_fewer') || 'fewer than last week'} — ${t('keep_going') || 'keep going!'}`
              : (t('journey_steady') || 'Steady pace — consistency wins')}
        </p>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 8 }}>
          <Stat label={t('this_week') || 'This week'} value={stats.thisWeek} trend={trend} trendColor={trendColor} />
          <Stat label={t('best_week') || 'Best week'} value={stats.bestWeek} icon="🏆" />
          <Stat label={t('avg_score_short') || 'Avg score'} value={`${stats.avgScore}%`} color={stats.avgScore >= 70 ? '#4caf7d' : stats.avgScore >= 50 ? '#f5a623' : '#ff6b6b'} />
          {stats.interviewing > 0 && <Stat label={t('interviewing') || 'In process'} value={stats.interviewing} icon="💬" />}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color, trend, trendColor, icon }) {
  return (
    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {icon ? `${icon} ` : ''}{label}
        </p>
        {trend !== undefined && trend !== 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: trendColor }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color || 'var(--text-primary)', lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  )
}
