export const LEGAL_VERSION = '2026-05-17'
export const TERMS_VERSION = LEGAL_VERSION
export const PRIVACY_VERSION = LEGAL_VERSION

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
