import React from 'react'
import { useLang } from '../context/LangContext'
import './BillingPage.css'

function PlanCard({ name, price, description, features, badge, current, t }) {
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

      <button type="button" className="billing-button" disabled>
        {current ? t('billing_free_plan') : t('billing_coming_soon')}
      </button>
    </article>
  )
}

export default function BillingPage() {
  const { t } = useLang()

  const plans = [
    {
      name: t('billing_free_plan'),
      price: t('billing_free_price'),
      description: t('billing_free_desc'),
      current: true,
      features: [
        t('billing_feature_ats_3'),
        t('billing_feature_profile_1'),
        t('billing_feature_history'),
        t('billing_feature_cv_builder_locked')
      ]
    },
    {
      name: t('billing_starter_name'),
      price: t('billing_starter_price'),
      description: t('billing_starter_desc'),
      badge: t('billing_popular'),
      features: [
        t('billing_feature_ats_40'),
        t('billing_feature_profile_10'),
        t('billing_feature_cv_builder'),
        t('billing_feature_priority')
      ]
    },
    {
      name: t('billing_pro_name'),
      price: t('billing_pro_price'),
      description: t('billing_pro_desc'),
      features: [
        t('billing_feature_ats_200'),
        t('billing_feature_profile_60'),
        t('billing_feature_cv_builder'),
        t('billing_feature_future')
      ]
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

        <section className="billing-grid">
          {plans.map(plan => <PlanCard key={plan.name} {...plan} t={t} />)}
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
