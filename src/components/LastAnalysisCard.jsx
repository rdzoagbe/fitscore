import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import StatusPill from './StatusPill'

// Surfaces the most recent analysis on the analyzer page so users have continuity
export default function LastAnalysisCard({ onSelectAnalysis }) {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        setAnalysis(data || null)
      } catch (e) {
        console.warn('Last analysis fetch error:', e.message)
      }
      setLoading(false)
    })()
  }, [user])

  if (loading) return null
  if (!analysis) return null

  const score = analysis.score || 0
  const color = score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff6b6b'
  const title = analysis.result?.job_context?.title || analysis.job_title || 'Untitled job'
  const company = analysis.result?.job_context?.company
  const verdict = analysis.result?.overall_verdict
  const verdictKey = verdict === 'likely_passed' ? 'verdict_passed' : verdict === 'borderline' ? 'verdict_borderline' : 'verdict_filtered'

  // Time ago string
  const localeMap = { en:'en-US', fr:'fr-FR', es:'es-ES', de:'de-DE', it:'it-IT', pt:'pt-PT' }
  const timeAgo = (() => {
    const diff = Date.now() - new Date(analysis.created_at).getTime()
    const min = Math.floor(diff / 60000)
    const hour = Math.floor(diff / 3600000)
    const day = Math.floor(diff / 86400000)
    if (min < 1) return t('just_now') || 'just now'
    if (min < 60) return `${min} ${t('min_ago') || 'min ago'}`
    if (hour < 24) return `${hour}h ${t('ago') || 'ago'}`
    if (day < 7) return `${day}d ${t('ago') || 'ago'}`
    return new Date(analysis.created_at).toLocaleDateString(localeMap[lang] || 'en-US', { day: '2-digit', month: 'short' })
  })()

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 24, animation: 'fadeUp 0.4s ease', cursor: 'pointer' }}
      onClick={() => onSelectAnalysis?.(analysis)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          ⏱ {t('your_last_analysis') || 'Your last analysis'} · {timeAgo}
        </p>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>
          {t('view') || 'View'} →
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}12` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'Syne, sans-serif' }}>{score}%</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
            {title}
          </p>
          {company && company !== 'Not specified' && (
            <p style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>@ {company}</p>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
            {verdict && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}30` }}>
                {t(verdictKey) || verdict}
              </span>
            )}
            <StatusPill analysis={analysis} onUpdate={u => setAnalysis(u)} compact />
          </div>
        </div>
      </div>
    </div>
  )
}
