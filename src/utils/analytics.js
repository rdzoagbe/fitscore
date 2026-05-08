const STORAGE_KEY = 'joblytics_analytics_events'

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
    const event = {
      name,
      payload: safePayload(payload),
      ts: new Date().toISOString(),
      path: window.location.pathname + window.location.hash
    }

    if (typeof window !== 'undefined' && typeof window.va === 'function') {
      window.va('event', { name, data: event.payload })
    }

    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    existing.push(event)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-100)))

    if (import.meta.env.DEV) console.log('[analytics]', event)
  } catch {
    // Analytics must never break the product experience.
  }
}

export function getRecentAnalyticsEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
