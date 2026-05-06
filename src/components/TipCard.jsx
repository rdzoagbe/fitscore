import React, { useState, useEffect } from 'react'
import { useLang } from '../context/LangContext'

// Rotating tips card to fill space below the analyzer + drive feature discovery
export default function TipCard({ onGoCoach, onGoHistory }) {
  const { t } = useLang()
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * 6))

  // Rotate tip every 8 seconds
  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 8000)
    return () => clearInterval(id)
  }, [])

  const tips = [
    {
      icon: '🎯',
      title: t('tip_track_title') || 'Track your applications',
      body: t('tip_track_body') || 'Mark each analysis as Applied, Interview, or Offer to see your funnel over time.',
      cta: t('tip_track_cta') || 'See history →',
      action: onGoHistory
    },
    {
      icon: '🎤',
      title: t('tip_coach_title') || 'Get a tailored cover letter',
      body: t('tip_coach_body') || 'CV Coach generates a complete letter with proper salutation, tone, and your signature in 5 seconds.',
      cta: t('tip_coach_cta') || 'Open CV Coach →',
      action: onGoCoach
    },
    {
      icon: '📋',
      title: t('tip_paste_title') || "URL not working? Paste the text",
      body: t('tip_paste_body') || 'LinkedIn and Indeed often block automated reading. Copying the description works on every site.',
      cta: null
    },
    {
      icon: '🔄',
      title: t('tip_reanalyze_title') || 'Already optimized your CV?',
      body: t('tip_reanalyze_body') || 'Re-run the same job to compare scores. We track your improvement over time with a delta indicator.',
      cta: null
    },
    {
      icon: '🌍',
      title: t('tip_languages_title') || '6 languages supported',
      body: t('tip_languages_body') || 'French, English, Spanish, German, Italian, Portuguese. Switch in settings — cover letters auto-localize.',
      cta: null
    },
    {
      icon: '🔒',
      title: t('tip_privacy_title') || 'Your CV stays on your device',
      body: t('tip_privacy_body') || 'We never share your CV with third parties. Stored locally for privacy, synced only with your account.',
      cta: null
    }
  ]

  const tip = tips[tipIdx]

  return (
    <div style={{ marginTop: 32, padding: '20px 22px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'var(--accent-bg)', filter: 'blur(40px)', opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{tip.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            💡 {t('tip_kicker') || 'Did you know?'}
          </p>
          <h4 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
            {tip.title}
          </h4>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: tip.cta ? 10 : 0 }}>
            {tip.body}
          </p>
          {tip.cta && tip.action && (
            <button onClick={tip.action} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {tip.cta}
            </button>
          )}
        </div>
      </div>

      {/* Tip dots indicator */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 14, position: 'relative' }}>
        {tips.map((_, i) => (
          <button
            key={i}
            onClick={() => setTipIdx(i)}
            style={{
              width: i === tipIdx ? 16 : 5, height: 5, borderRadius: 5,
              background: i === tipIdx ? 'var(--accent)' : 'var(--border)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease'
            }}
            aria-label={`Tip ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
