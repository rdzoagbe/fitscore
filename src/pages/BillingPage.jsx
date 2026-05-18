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

function PlanCard({ planId, name, price, description, features, badge, current, t, checkoutLoading, selected, onSelectPlan }) {
  const paid = !current
  const buttonText = current ? t('billing_free_plan') : checkoutLoading === planId ? t('billing_redirecting', 'Redirecting...') : t('billing_choose_plan', { plan: name }, `Choose ${name}`)

  return (
    <article className={`billing-card ${badge ? 'is-highlighted' : ''} ${selected ? 'is-selected' : ''}`}>
      <div className="billing-cardTop"><div><p className="billing-kicker">{current ? t('billing_current_plan') : name}</p><h2>{name}</h2></div>{badge && <span className="billing-badge">{badge}</span>}</div>
      <div className="billing-price"><strong>{price}</strong><span>/ {t('billing_month')}</span></div>
      <p className="billing-desc">{description}</p>
      <ul className="billing-features">{features.map(feature => <li key={feature}>{feature}</li>)}</ul>
      <button type="button" className="billing-button" disabled={current || checkoutLoading === planId} onClick={() => paid && onSelectPlan({ planId, name, price, description, features })}>{buttonText}</button>
    </article>
  )
}

function BillingContractModal({ plan, t, legalAccepted, withdrawalAccepted, legalError, checkoutLoading, onToggleLegal, onToggleWithdrawal, onCancel, onConfirm }) {
  if (!plan) return null
  const loading = checkoutLoading === plan.planId
  return (
    <div className="billing-contractBackdrop" role="dialog" aria-modal="true" aria-labelledby="billing-contract-title">
      <article className="billing-contract">
        <button type="button" className="billing-contractClose" onClick={onCancel} disabled={loading} aria-label={t('close', 'Close')}>×</button>
        <div className="billing-contractHead"><p className="billing-kicker">{t('billing_contract_kicker', 'Subscription contract')}</p><h2 id="billing-contract-title">{t('billing_contract_title', { plan: plan.name }, `Confirm your ${plan.name} subscription`)}</h2><span>{t('billing_contract_subtitle', 'Review the selected plan and accept the required legal terms before being redirected to Stripe Checkout.')}</span></div>
        <div className="billing-contractPlan"><div><span>{t('billing_contract_selected_plan', 'Selected plan')}</span><strong>{plan.name}</strong><p>{plan.description}</p></div><div className="billing-contractPrice"><strong>{plan.price}</strong><em>/ {t('billing_month')}</em></div></div>
        <div className="billing-contractTerms">
          <h3>{t('billing_contract_terms_title', 'Required acceptance')}</h3>
          <label className="billing-legalCheck"><input type="checkbox" checked={legalAccepted} onChange={event => onToggleLegal(event.target.checked)} /><span>{t('billing_legal_checkbox')} <a href="/terms" target="_blank" rel="noreferrer">{t('terms_of_use')}</a> · <a href="/privacy" target="_blank" rel="noreferrer">{t('privacy_policy_full')}</a> · <a href="/legal" target="_blank" rel="noreferrer">{t('legal_notice')}</a></span></label>
          <label className="billing-legalCheck"><input type="checkbox" checked={withdrawalAccepted} onChange={event => onToggleWithdrawal(event.target.checked)} /><span>{t('billing_withdrawal_checkbox')}</span></label>
          <p className="billing-contractVersion">{t('billing_contract_version', 'Legal version')}: {TERMS_VERSION}</p>
        </div>
        {legalError && <p className="billing-error">⚠ {legalError}</p>}
        <div className="billing-contractActions"><button type="button" className="billing-secondaryButton" onClick={onCancel} disabled={loading}>{t('cancel', 'Cancel')}</button><button type="button" className="billing-button" onClick={onConfirm} disabled={loading}>{loading ? t('billing_redirecting', 'Redirecting...') : t('billing_accept_contract_checkout', 'Accept and continue to checkout')}</button></div>
      </article>
    </div>
  )
}

export default function BillingPage() {
  const { session } = useAuth()
  const { t } = useLang()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [withdrawalAccepted, setWithdrawalAccepted] = useState(false)
  const [legalError, setLegalError] = useState('')
  const [readyMessage, setReadyMessage] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState('')

  const plans = [
    { planId: 'free', name: t('billing_free_plan'), price: t('billing_free_price'), description: t('billing_free_desc'), current: true, features: [t('billing_feature_ats_3'), t('billing_feature_profile_1'), t('billing_feature_history'), t('billing_feature_cv_builder_locked')] },
    { planId: 'starter', name: t('billing_starter_name'), price: t('billing_starter_price'), description: t('billing_starter_desc'), badge: t('billing_popular'), features: [t('billing_feature_ats_40'), t('billing_feature_profile_10'), t('billing_feature_cv_builder'), t('billing_feature_priority')] },
    { planId: 'pro', name: t('billing_pro_name'), price: t('billing_pro_price'), description: t('billing_pro_desc'), features: [t('billing_feature_ats_200'), t('billing_feature_profile_60'), t('billing_feature_cv_builder'), t('billing_feature_future')] }
  ]

  const onSelectPlan = plan => { setSelectedPlan(plan); setLegalAccepted(false); setWithdrawalAccepted(false); setLegalError(''); setReadyMessage('') }
  const onToggleLegal = value => { setLegalAccepted(value); if (value && withdrawalAccepted) setLegalError('') }
  const onToggleWithdrawal = value => { setWithdrawalAccepted(value); if (value && legalAccepted) setLegalError('') }
  const onCancelContract = () => { if (checkoutLoading) return; setSelectedPlan(null); setLegalAccepted(false); setWithdrawalAccepted(false); setLegalError('') }

  const onConfirmContract = async () => {
    if (!selectedPlan) return
    setReadyMessage('')
    if (!legalAccepted) { setLegalError(t('billing_legal_required')); return }
    if (!withdrawalAccepted) { setLegalError(t('billing_withdrawal_required')); return }
    setLegalError('')
    setCheckoutLoading(selectedPlan.planId)
    try {
      const legalAcceptance = billingLegalAcceptancePayload({ planId: selectedPlan.planId, planName: selectedPlan.name, source: 'billing_contract_modal_stripe_checkout' })
      storePendingBillingLegalAcceptance(legalAcceptance)
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error(t('billing_signin_required', 'Please sign in before subscribing.'))
      const res = await fetch('/api/create-checkout-v2', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ planId: selectedPlan.planId, legalAcceptance }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not start checkout (${res.status})`)
      if (!data?.url) throw new Error('Stripe did not return a checkout URL.')
      window.location.href = data.url
    } catch (e) {
      setLegalError(e.message || t('billing_checkout_failed', 'Could not start checkout. Please try again.'))
      setCheckoutLoading('')
    }
  }

  return (
    <div className="billing-page">
      <main className="billing-shell">
        <section className="billing-hero"><div><p className="billing-kicker">{t('billing_kicker')}</p><h1>{t('billing_title')}</h1><p>{t('billing_subtitle')}</p></div><div className="billing-status"><strong>{t('billing_status_ready')}</strong><span>{t('billing_status_body')}</span></div></section>
        <section className="billing-legalPanel"><div><p className="billing-kicker">{t('billing_legal_title')}</p><h2>{t('billing_checkout_ready')}</h2><p>{t('billing_legal_body')}</p></div><strong>{TERMS_VERSION}</strong></section>
        {readyMessage && <p className="billing-ready">✓ {readyMessage}</p>}
        <section className="billing-grid">{plans.map(plan => <PlanCard key={plan.planId} {...plan} t={t} selected={selectedPlan?.planId === plan.planId} checkoutLoading={checkoutLoading} onSelectPlan={onSelectPlan} />)}</section>
        <section className="billing-infoGrid"><article className="billing-info"><p className="billing-kicker">{t('billing_note_title')}</p><p>{t('billing_note_body')}</p></article><article className="billing-info"><p className="billing-kicker">{t('billing_free_limit_title')}</p><p>{t('billing_free_limit_body')}</p></article></section>
      </main>
      <BillingContractModal plan={selectedPlan} t={t} legalAccepted={legalAccepted} withdrawalAccepted={withdrawalAccepted} legalError={legalError} checkoutLoading={checkoutLoading} onToggleLegal={onToggleLegal} onToggleWithdrawal={onToggleWithdrawal} onCancel={onCancelContract} onConfirm={onConfirmContract} />
    </div>
  )
}