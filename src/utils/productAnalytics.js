const ANALYTICS_KEY = 'joblytics_product_events_v1'
const ERROR_KEY = 'joblytics_error_events_v1'
const MAX_EVENTS = 150
const MAX_ERRORS = 80

function safeJsonRead(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '')
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function safeJsonWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function sanitizePayload(payload = {}) {
  const safe = {}
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (/email|token|password|secret|key|cvBase64|body|text|description/i.test(key)) return
    if (typeof value === 'string') safe[key] = value.slice(0, 180)
    else if (typeof value === 'number' || typeof value === 'boolean') safe[key] = value
    else if (Array.isArray(value)) safe[key] = value.slice(0, 12).map(item => typeof item === 'string' ? item.slice(0, 100) : item)
    else if (typeof value === 'object') safe[key] = '[object]'
  })
  return safe
}

export function trackEvent(name, payload = {}) {
  if (!name) return
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    payload: sanitizePayload(payload),
    path: window.location.pathname,
    createdAt: new Date().toISOString()
  }
  const existing = safeJsonRead(ANALYTICS_KEY, [])
  safeJsonWrite(ANALYTICS_KEY, [event, ...existing].slice(0, MAX_EVENTS))
  if (import.meta.env?.DEV) console.info('[Joblytics event]', event)
}

export function trackError(name, error, payload = {}) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || 'unknown_error',
    message: String(error?.message || error || 'Unknown error').slice(0, 300),
    stack: import.meta.env?.DEV ? String(error?.stack || '').slice(0, 1200) : undefined,
    payload: sanitizePayload(payload),
    path: window.location.pathname,
    createdAt: new Date().toISOString()
  }
  const existing = safeJsonRead(ERROR_KEY, [])
  safeJsonWrite(ERROR_KEY, [item, ...existing].slice(0, MAX_ERRORS))
  console.error('[Joblytics error]', item)
}

export function getProductEvents() {
  return safeJsonRead(ANALYTICS_KEY, [])
}

export function getErrorEvents() {
  return safeJsonRead(ERROR_KEY, [])
}

export function clearProductDiagnostics() {
  safeJsonWrite(ANALYTICS_KEY, [])
  safeJsonWrite(ERROR_KEY, [])
}

export function getUsageSnapshot() {
  const events = getProductEvents()
  const errors = getErrorEvents()
  const byName = events.reduce((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + 1
    return acc
  }, {})
  return {
    eventsCount: events.length,
    errorsCount: errors.length,
    byName,
    latestEvent: events[0] || null,
    latestError: errors[0] || null
  }
}
