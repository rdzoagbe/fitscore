import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import { TERMS_VERSION } from '../lib/legal'
import './BillingPage.css'

function PlanCard({ name, price, description, features, badge, current, t, legalAccepted, onToggleLegal, onBlockedCheckout }) {
  const paid = !current
  const buttonText = current ? t('billing_free_plan') : legalAccepted ? t('billing_coming_soon') : t('billing_accept_to_continue')

  return (
    <article className={`billing-card ${badge ? 'is-highlighted' : ''}`}>
      <div className="billing-cardTop">
        <div>
          <p className="billing-kicker">{current ? t('billing_current_plan') : name}</p>
          <h2>{name}</h2>
        </div>
        {badge && <span className="billing-badge">{badge}</span>}
      </div>

      <div className="billing-price">
        <strong>{price}</strong>
        <span>/ {t('billing_month')}</span>
      </div>

      <p className="billing-desc">{description}</p>

      <ul className="billing-features">
        {features.map(feature => <li key={feature}>{feature}</li>)}
      </ul>

      {paid && (
        <label className="billing-legalCheck">
          <input type="checkbox" checked={legalAccepted} onChange={event => onToggleLegal(event.target.checked)} />
          <span>{t('billing_legal_checkbox')} <a href="/terms" target="_blank" rel="noreferrer">{t('terms_of_use')}</a> · <a href="/privacy" target="_blank" rel="noreferrer">{t('privacy_policy_full')}</a></span>
        </label>
      )}

      <button type="button" className="billing-button" disabled={current} onClick={paid && !legalAccepted ? onBlockedCheckout : undefined}>
        {buttonText}
      </button>
    </article>
  )
}

export default function BillingPage() {
  const { t } = useLang()
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [legalError, setLegalError] = useState('')

  const onToggleLegal = value => {
    setLegalAccepted(value)
    if (value) setLegalError('')
  }

  const onBlockedCheckout = () => setLegalError(t('billing_legal_required'))

  const plans = [
    {
      name: t('billing_free_plan'),
      price: t('billing_free_price'),
      description: t('billing_free_desc'),
      current: true,
      features: [t('billing_feature_ats_3'), t('billing_feature_profile_1'), t('billing_feature_history'), t('billing_feature_cv_builder_locked')]
    },
    {
      name: t('billing_starter_name'),
      price: t('billing_starter_price'),
      description: t('billing_starter_desc'),
      badge: t('billing_popular'),
      features: [t('billing_feature_ats_40'), t('billing_feature_profile_10'), t('billing_feature_cv_builder'), t('billing_feature_priority')]
    },
    {
      name: t('billing_pro_name'),
      price: t('billing_pro_price'),
      description: t('billing_pro_desc'),
      features: [t('billing_feature_ats_200'), t('billing_feature_profile_60'), t('billing_feature_cv_builder'), t('billing_feature_future')]
    }
  ]

  return (
    <div className="billing-page">
      <main className="billing-shell">
        <section className="billing-hero">
          <div>
            <p className="billing-kicker">{t('billing_kicker')}</p>
            <h1>{t('billing_title')}</h1>
            <p>{t('billing_subtitle')}</p>
          </div>
          <div className="billing-status">
            <strong>{t('billing_status_ready')}</strong>
            <span>{t('billing_status_body')}</span>
          </div>
        </section>

        <section className="billing-legalPanel">
          <div>
            <p className="billing-kicker">{t('billing_legal_title')}</p>
            <h2>{t('billing_checkout_ready')}</h2>
            <p>{t('billing_legal_body')}</p>
          </div>
          <strong>{TERMS_VERSION}</strong>
        </section>

        {legalError && <p className="billing-error">⚠ {legalError}</p>}

        <section className="billing-grid">
          {plans.map(plan => <PlanCard key={plan.name} {...plan} t={t} legalAccepted={legalAccepted} onToggleLegal={onToggleLegal} onBlockedCheckout={onBlockedCheckout} />)}
        </section>

        <section className="billing-infoGrid">
          <article className="billing-info">
            <p className="billing-kicker">{t('billing_note_title')}</p>
            <p>{t('billing_note_body')}</p>
          </article>
          <article className="billing-info">
            <p className="billing-kicker">{t('billing_free_limit_title')}</p>
            <p>{t('billing_free_limit_body')}</p>
          </article>
        </section>
      </main>
    </div>
  )
}