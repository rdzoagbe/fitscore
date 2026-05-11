const STORAGE_KEY = 'joblytics_analytics_events'
const MAX_STORED = 250

export const analyticsEvents = {
  PAGE_VIEWED: 'page_viewed',
  SIGN_IN_STARTED: 'sign_in_started',
  SIGN_UP_STARTED: 'sign_up_started',
  SIGNUP_COMPLETED: 'signup_completed',
  CV_UPLOADED: 'cv_uploaded',
  CV_SELECTED: 'cv_selected',
  CV_METADATA_UPDATED: 'cv_metadata_updated',
  CV_DEFAULT_SET: 'cv_default_set',
  CV_DELETED: 'cv_deleted',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',
  ANALYSIS_FAILED: 'analysis_failed',
  RESULT_VIEWED: 'result_viewed',
  COVER_LETTER_GENERATED: 'cover_letter_generated',
  COVER_LETTER_FAILED: 'cover_letter_failed',
  APPLICATION_STATUS_CHANGED: 'application_status_changed',
  APPLICATION_TRACKER_UPDATED: 'application_tracker_updated',
  APPLICATION_DETAILS_OPENED: 'application_details_opened',
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
  CONTACT_OPENED: 'contact_opened',
  CONTACT_SUBMITTED: 'contact_submitted',
  PRICING_VIEWED: 'pricing_viewed',
  LIMITS_VIEWED: 'limits_viewed',
  PLAN_MENU_OPENED: 'plan_menu_opened',
  PLAN_CLICKED: 'plan_clicked',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FRONTEND_CRASH: 'frontend_crash'
}

function readEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function safePayload(payload = {}) {
  const cleaned = {}
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || typeof value === 'function') return
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) cleaned[key] = value
    else cleaned[key] = JSON.stringify(value).slice(0, 500)
  })
  return cleaned
}

export function trackEvent(name, payload = {}) {
  try {
    if (!name || typeof window === 'undefined') return
    const event = {
      name,
      payload: safePayload(payload),
      ts: new Date().toISOString(),
      path: window.location.pathname + window.location.hash
    }

    if (typeof window.va === 'function') window.va('event', { name, data: event.payload })
    if (window.posthog && typeof window.posthog.capture === 'function') window.posthog.capture(name, event.payload)
    if (typeof window.gtag === 'function') window.gtag('event', name, event.payload)

    const existing = readEvents()
    existing.push(event)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-MAX_STORED)))

    if (import.meta.env.DEV) console.log('[analytics]', event)
  } catch {
    // Analytics must never break the product experience.
  }
}

export function trackPageView(pageName, payload = {}) {
  trackEvent(analyticsEvents.PAGE_VIEWED, { page: pageName, ...payload })
}

export function getRecentAnalyticsEvents() {
  return readEvents()
}
