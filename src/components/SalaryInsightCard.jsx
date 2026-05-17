import React, { useState } from 'react'
import { useLang } from '../context/LangContext'

function fmt(n, currency = 'EUR', lang = 'en') {
  if (n === null || n === undefined) return ''
  const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT' }
  try {
    return new Intl.NumberFormat(localeMap[lang] || 'en-US', {
      style: 'currency', currency,
      maximumFractionDigits: 0, minimumFractionDigits: 0
    }).format(n)
  } catch {
    return `${n.toLocaleString()} ${currency}`
  }
}

export default function SalaryInsightCard({ data }) {
  const { t, lang } = useLang()
  const [expanded, setExpanded] = useState(false)
  const si = data?.salary_intelligence

  if (!si || !si.target_low || !si.target_high) return null

  const isPosted = si.scenario === 'salary_mentioned' && si.posted_low && si.posted_high
  const currency = si.currency || 'EUR'
  const confColor = si.confidence === 'high' ? '#4caf7d' : si.confidence === 'medium' ? '#f5a623' : '#ff8e6b'
  const confLabel = {
    high: t('salary_conf_high'),
    medium: t('salary_conf_medium'),
    low: t('salary_conf_low')
  }[si.confidence] || ''

  const fmtFn = (n) => fmt(n, currency, lang)

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, marginBottom: 14, overflow: 'hidden',
      animation: 'fadeUp 0.4s ease'
    }}>
      <div style={{ padding: '14px 16px', borderBottom: expanded ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 10 }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>💰</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
              {isPosted ? t('salary_negotiation_kicker') : t('salary_estimate_kicker')}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('salary_target')}: <span style={{ color: 'var(--accent)' }}>{fmtFn(si.target_low)} – {fmtFn(si.target_high)}</span>
            </p>
          </div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 14, transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
      </div>

      {expanded && (
        <div style={{ padding: '14px 16px 16px' }}>
          {isPosted && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                {t('salary_posted_in_offer')}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                {fmtFn(si.posted_low)} – {fmtFn(si.posted_high)}
              </p>
            </div>
          )}

          {!isPosted && si.estimated_market_low && si.estimated_market_high && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                {t('salary_typical_market')}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                {fmtFn(si.estimated_market_low)} – {fmtFn(si.estimated_market_high)}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div style={{ padding: '10px 12px', background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#4caf7d', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                ✓ {t('salary_target_label')}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                {fmtFn(si.target_low)} – {fmtFn(si.target_high)}
              </p>
            </div>
            {si.leverage_points?.length >= 1 && si.target_high && (
              <div style={{ padding: '10px 12px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#f5a623', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
                  ⚡ {t('salary_stretch_label')}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
                  {fmtFn(Math.round(si.target_high * 1.05))}+
                </p>
              </div>
            )}
          </div>

          {si.leverage_points?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                ⚡ {t('salary_leverage_kicker')}
              </p>
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {si.leverage_points.map((point, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 4 }}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {si.negotiation_strategy && (
            <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                🎯 {t('salary_strategy_kicker')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {si.negotiation_strategy}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 10, color: 'var(--text-hint)', fontStyle: 'italic', lineHeight: 1.5, flex: 1 }}>
              ℹ️ {t('salary_disclaimer')}
            </p>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: `${confColor}18`, color: confColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {confLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}