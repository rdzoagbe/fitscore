const STORAGE_KEY = 'joblytics_analytics_events'

export const analyticsEvents = {
  SIGN_IN_STARTED: 'sign_in_started',
  SIGN_UP_STARTED: 'sign_up_started',
  CV_UPLOADED: 'cv_uploaded',
  CV_SELECTED: 'cv_selected',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',
  ANALYSIS_FAILED: 'analysis_failed',
  RESULT_VIEWED: 'result_viewed',
  COVER_LETTER_GENERATED: 'cover_letter_generated',
  APPLICATION_STATUS_CHANGED: 'application_status_changed',
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
  CONTACT_OPENED: 'contact_opened',
  PRICING_VIEWED: 'pricing_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed'
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

    if (typeof window.va === 'function') {
      window.va('event', { name, data: event.payload })
    }

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    existing.push(event)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-150)))

    if (import.meta.env.DEV) console.log('[analytics]', event)
  } catch {
    // Analytics must never break the product experience.
  }
}

export function getRecentAnalyticsEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
