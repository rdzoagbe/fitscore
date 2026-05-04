import React from 'react'
import { useLang } from '../context/LangContext'

// Score-aware action card guiding users on what to do next
export default function NextStepsCard({ score, onGoCoach, onReset, jobUrl, easyApply }) {
  const { t } = useLang()

  // Determine the right narrative based on score
  let variant
  if (score >= 75) {
    variant = {
      kind: 'success',
      icon: '🎉',
      kicker: t('next_steps_success_kicker') || 'STRONG MATCH',
      title: t('next_steps_success_title') || 'Great fit! Time to apply.',
      desc: t('next_steps_success_desc') || 'Your CV is well-aligned with this role. Generate a tailored cover letter to make a strong first impression.',
      primaryCta: t('next_steps_success_cta') || '✉️ Generate cover letter',
      primaryAction: onGoCoach,
      secondaryCta: t('next_steps_apply') || 'Apply now →',
      secondaryAction: jobUrl ? () => window.open(jobUrl, '_blank') : null,
      color: '#4caf7d',
      bg: 'rgba(76,175,125,0.08)',
      border: 'rgba(76,175,125,0.3)'
    }
  } else if (score >= 60) {
    variant = {
      kind: 'medium',
      icon: '💪',
      kicker: t('next_steps_medium_kicker') || 'CLOSE MATCH',
      title: t('next_steps_medium_title') || "You're close — let's polish",
      desc: t('next_steps_medium_desc') || 'A few targeted improvements could push your score over 75. Open CV Coach to see exactly what to fix.',
      primaryCta: t('next_steps_medium_cta') || '🎤 Open CV Coach',
      primaryAction: onGoCoach,
      secondaryCta: t('next_steps_run_another') || '↻ Try another job',
      secondaryAction: onReset,
      color: '#f5a623',
      bg: 'rgba(245,166,35,0.08)',
      border: 'rgba(245,166,35,0.3)'
    }
  } else {
    variant = {
      kind: 'low',
      icon: '🛠',
      kicker: t('next_steps_low_kicker') || 'NEEDS WORK',
      title: t('next_steps_low_title') || 'Your CV needs significant tuning for this role',
      desc: t('next_steps_low_desc') || "Don't apply yet — most candidates improve their score by 20+ points after rewriting with CV Coach. It's worth the 10 minutes.",
      primaryCta: t('next_steps_low_cta') || '🛠 Fix my CV with Coach',
      primaryAction: onGoCoach,
      secondaryCta: t('next_steps_run_another') || '↻ Try another job',
      secondaryAction: onReset,
      color: '#ff8e6b',
      bg: 'rgba(255,142,107,0.08)',
      border: 'rgba(255,142,107,0.3)'
    }
  }

  return (
    <div style={{
      background: variant.bg, border: `1px solid ${variant.border}`,
      borderRadius: 18, padding: 'clamp(18px,4vw,24px)',
      marginTop: 16, marginBottom: 14,
      animation: 'fadeUp 0.4s ease',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: variant.bg, filter: 'blur(40px)', opacity: 0.6, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 32, flexShrink: 0, lineHeight: 1 }}>{variant.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: variant.color, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            {variant.kicker}
          </p>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(16px,3.5vw,19px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {variant.title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
            {variant.desc}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={variant.primaryAction} style={{
              background: variant.color, color: '#1A1B22', border: 'none',
              borderRadius: 12, padding: '10px 18px',
              fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: `0 4px 14px ${variant.bg}`
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
              {variant.primaryCta}
            </button>
            {variant.secondaryAction && (
              <button onClick={variant.secondaryAction} style={{
                background: 'var(--bg-card)', color: 'var(--text-secondary)',
                border: '1px solid var(--border)', borderRadius: 12,
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
              }}>
                {variant.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
