import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { TERMS_VERSION, billingLegalAcceptancePayload, storePendingBillingLegalAcceptance } from '../lib/legal'
import './BillingPage.css'

async function getFreshAccessToken(session) {
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

function PlanCard({ planId, name, price, description, features, badge, current, t, legalAccepted, withdrawalAccepted, checkoutLoading, onToggleLegal, onToggleWithdrawal, onBlockedCheckout, onReadyCheckout }) {
  const paid = !current
  const canCheckout = legalAccepted && withdrawalAccepted
  const buttonText = current ? t('billing_free_plan') : checkoutLoading === planId ? t('billing_redirecting', 'Redirecting...') : canCheckout ? t('billing_start_checkout', 'Start checkout') : t('billing_accept_to_continue')

  const handleClick = () => {
    if (!paid) return
    if (!canCheckout) return onBlockedCheckout()
    onReadyCheckout({ planId, planName: name })
  }

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
      <ul className="billing-features">{features.map(feature => <li key={feature}>{feature}</li>)}</ul>

      {paid && (
        <div className="billing-legalStack">
          <label className="billing-legalCheck">
            <input type="checkbox" checked={legalAccepted} onChange={event => onToggleLegal(event.target.checked)} />
            <span>{t('billing_legal_checkbox')} <a href="/terms" target="_blank" rel="noreferrer">{t('terms_of_use')}</a> · <a href="/privacy" target="_blank" rel="noreferrer">{t('privacy_policy_full')}</a> · <a href="/legal" target="_blank" rel="noreferrer">{t('legal_notice')}</a></span>
          </label>
          <label className="billing-legalCheck">
            <input type="checkbox" checked={withdrawalAccepted} onChange={event => onToggleWithdrawal(event.target.checked)} />
            <span>{t('billing_withdrawal_checkbox')}</span>
          </label>
        </div>
      )}

      <button type="button" className="billing-button" disabled={current || checkoutLoading === planId} onClick={handleClick}>{buttonText}</button>
    </article>
  )
}

export default function BillingPage() {
  const { session } = useAuth()
  const { t } = useLang()
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [withdrawalAccepted, setWithdrawalAccepted] = useState(false)
  const [legalError, setLegalError] = useState('')
  const [readyMessage, setReadyMessage] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState('')

  const onToggleLegal = value => {
    setLegalAccepted(value)
    setReadyMessage('')
    if (value && withdrawalAccepted) setLegalError('')
  }

  const onToggleWithdrawal = value => {
    setWithdrawalAccepted(value)
    setReadyMessage('')
    if (value && legalAccepted) setLegalError('')
  }

  const onBlockedCheckout = () => {
    setReadyMessage('')
    if (!legalAccepted) setLegalError(t('billing_legal_required'))
    else if (!withdrawalAccepted) setLegalError(t('billing_withdrawal_required'))
  }

  const onReadyCheckout = async ({ planId, planName }) => {
    setLegalError('')
    setReadyMessage('')
    setCheckoutLoading(planId)

    try {
      const legalAcceptance = billingLegalAcceptancePayload({ planId, planName, source: 'billing_page_stripe_checkout' })
      storePendingBillingLegalAcceptance(legalAcceptance)
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('billing_signin_required', 'Please sign in before subscribing.'))

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId, legalAcceptance })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not start checkout (${res.status})`)
      if (!data?.url) throw new Error('Stripe did not return a checkout URL.')
      window.location.href = data.url
    } catch (e) {
      setLegalError(e.message || t('billing_checkout_failed', 'Could not start checkout. Please try again.'))
      setCheckoutLoading('')
    }
  }

  const plans = [
    {
      planId: 'free',
      name: t('billing_free_plan'),
      price: t('billing_free_price'),
      description: t('billing_free_desc'),
      current: true,
      features: [t('billing_feature_ats_3'), t('billing_feature_profile_1'), t('billing_feature_history'), t('billing_feature_cv_builder_locked')]
    },
    {
      planId: 'starter',
      name: t('billing_starter_name'),
      price: t('billing_starter_price'),
      description: t('billing_starter_desc'),
      badge: t('billing_popular'),
      features: [t('billing_feature_ats_40'), t('billing_feature_profile_10'), t('billing_feature_cv_builder'), t('billing_feature_priority')]
    },
    {
      planId: 'pro',
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
          <div><p className="billing-kicker">{t('billing_kicker')}</p><h1>{t('billing_title')}</h1><p>{t('billing_subtitle')}</p></div>
          <div className="billing-status"><strong>{t('billing_status_ready')}</strong><span>{t('billing_status_body')}</span></div>
        </section>

        <section className="billing-legalPanel">
          <div><p className="billing-kicker">{t('billing_legal_title')}</p><h2>{t('billing_checkout_ready')}</h2><p>{t('billing_legal_body')}</p></div>
          <strong>{TERMS_VERSION}</strong>
        </section>

        {legalError && <p className="billing-error">⚠ {legalError}</p>}
        {readyMessage && <p className="billing-ready">✓ {readyMessage}</p>}

        <section className="billing-grid">
          {plans.map(plan => <PlanCard key={plan.name} {...plan} t={t} legalAccepted={legalAccepted} withdrawalAccepted={withdrawalAccepted} checkoutLoading={checkoutLoading} onToggleLegal={onToggleLegal} onToggleWithdrawal={onToggleWithdrawal} onBlockedCheckout={onBlockedCheckout} onReadyCheckout={onReadyCheckout} />)}
        </section>

        <section className="billing-infoGrid">
          <article className="billing-info"><p className="billing-kicker">{t('billing_note_title')}</p><p>{t('billing_note_body')}</p></article>
          <article className="billing-info"><p className="billing-kicker">{t('billing_free_limit_title')}</p><p>{t('billing_free_limit_body')}</p></article>
        </section>
      </main>
    </div>
  )
}