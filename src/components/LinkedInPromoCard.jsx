import React from 'react'
import { useLang } from '../context/LangContext'

// Compact promo card on analyzer page that drives users to the LinkedIn Optimizer
export default function LinkedInPromoCard({ onGo }) {
  const { t } = useLang()

  return (
    <button onClick={onGo} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'linear-gradient(135deg, rgba(10,102,194,0.08) 0%, rgba(224,120,86,0.06) 100%)',
      border: '1px solid var(--border)', borderRadius: 14,
      padding: '14px 16px', marginBottom: 18, fontFamily: 'inherit',
      transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: 28, flexShrink: 0 }}>🔗</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#0A66C2', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
          {t('linkedin_promo_kicker') || 'New tool'}
        </p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, fontFamily: 'Syne, sans-serif' }}>
          {t('linkedin_promo_title') || 'Optimize your LinkedIn profile'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {t('linkedin_promo_desc') || 'Get section-by-section feedback with copy-paste-ready improvements'}
        </p>
      </div>
      <div style={{ color: 'var(--accent)', fontSize: 16, flexShrink: 0 }}>→</div>
    </button>
  )
}
