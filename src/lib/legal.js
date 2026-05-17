export const LEGAL_VERSION = '2026-05-17'
export const TERMS_VERSION = LEGAL_VERSION
export const PRIVACY_VERSION = LEGAL_VERSION
export const BILLING_LEGAL_VERSION = LEGAL_VERSION

export function hasAcceptedCurrentTerms(user) {
  const meta = { ...(user?.user_metadata || {}), ...(user?.app_metadata || {}) }
  return meta.terms_accepted === true && meta.terms_version === TERMS_VERSION && !!meta.terms_accepted_at
}

export function legalAcceptancePayload(source = 'app') {
  return {
    terms_accepted: true,
    terms_version: TERMS_VERSION,
    terms_accepted_at: new Date().toISOString(),
    privacy_acknowledged: true,
    privacy_version: PRIVACY_VERSION,
    legal_acceptance_source: source
  }
}

export function billingLegalAcceptancePayload({ planId, planName, source = 'billing_page' } = {}) {
  const acceptedAt = new Date().toISOString()
  return {
    billing_legal_accepted: true,
    billing_legal_version: BILLING_LEGAL_VERSION,
    billing_legal_accepted_at: acceptedAt,
    billing_legal_source: source,
    billing_terms_accepted: true,
    billing_terms_version: TERMS_VERSION,
    billing_terms_accepted_at: acceptedAt,
    billing_privacy_acknowledged: true,
    billing_privacy_version: PRIVACY_VERSION,
    withdrawal_acknowledged: true,
    withdrawal_acknowledged_at: acceptedAt,
    digital_service_immediate_access_requested: true,
    plan_id: planId || null,
    plan_name: planName || null
  }
}

export function storePendingBillingLegalAcceptance(payload) {
  try {
    localStorage.setItem('joblytics_pending_billing_legal_acceptance', JSON.stringify(payload))
  } catch {
    // non-blocking: Stripe checkout metadata should remain the source of truth once enabled
  }
}

export function getPendingBillingLegalAcceptance() {
  try {
    return JSON.parse(localStorage.getItem('joblytics_pending_billing_legal_acceptance') || 'null')
  } catch {
    return null
  }
}