import React from 'react'
import { useLang } from '../context/LangContext'

export default function NextStepsCard({ score, onGoCoach, onReset, jobUrl, easyApply }) {
  const { t } = useLang()

  let variant
  if (score >= 75) {
    variant = {
      kind: 'success',
      icon: '🎉',
      kicker: t('next_steps_success_kicker'),
      title: t('next_steps_success_title'),
      desc: t('next_steps_success_desc'),
      primaryCta: t('next_steps_success_cta'),
      primaryAction: onGoCoach,
      secondaryCta: t('next_steps_apply'),
      secondaryAction: jobUrl ? () => window.open(jobUrl, '_blank') : null,
      color: '#4caf7d',
      bg: 'rgba(76,175,125,0.08)',
      border: 'rgba(76,175,125,0.3)'
    }
  } else if (score >= 60) {
    variant = {
      kind: 'medium',
      icon: '💪',
      kicker: t('next_steps_medium_kicker'),
      title: t('next_steps_medium_title'),
      desc: t('next_steps_medium_desc'),
      primaryCta: t('next_steps_medium_cta'),
      primaryAction: onGoCoach,
      secondaryCta: t('next_steps_run_another'),
      secondaryAction: onReset,
      color: '#f5a623',
      bg: 'rgba(245,166,35,0.08)',
      border: 'rgba(245,166,35,0.3)'
    }
  } else {
    variant = {
      kind: 'low',
      icon: '🛠',
      kicker: t('next_steps_low_kicker'),
      title: t('next_steps_low_title'),
      desc: t('next_steps_low_desc'),
      primaryCta: t('next_steps_low_cta'),
      primaryAction: onGoCoach,
      secondaryCta: t('next_steps_run_another'),
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