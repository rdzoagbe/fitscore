import { supabase } from '../lib/supabase'

const MAX_FIELD = 4000

function safeString(value, max = MAX_FIELD) {
  if (value == null) return null
  return String(value).slice(0, max)
}

function getBrowserContext() {
  if (typeof window === 'undefined') return {}
  return {
    path: window.location?.pathname || '/',
    href: window.location?.href || null,
    userAgent: navigator?.userAgent || null,
    language: navigator?.language || null,
    width: window.innerWidth || null,
    height: window.innerHeight || null
  }
}

export async function reportReliabilityEvent(payload = {}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    const browser = getBrowserContext()

    await fetch('/api/admin/log-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        source: payload.source || 'frontend',
        severity: payload.severity || 'error',
        page_path: payload.page_path || browser.path,
        message: safeString(payload.message || payload.error?.message || 'Unknown client error', 1000),
        stack: safeString(payload.stack || payload.error?.stack, 8000),
        endpoint: payload.endpoint || null,
        status_code: payload.status_code || null,
        browser,
        metadata: payload.metadata || {}
      })
    })
  } catch (error) {
    console.warn('Reliability event failed:', error?.message || error)
  }
}

export function reportClientError(error, metadata = {}) {
  return reportReliabilityEvent({
    source: 'frontend',
    severity: 'error',
    message: error?.message || error || 'Client error',
    stack: error?.stack || null,
    metadata
  })
}

export function reportApiFailure(endpoint, statusCode, metadata = {}) {
  return reportReliabilityEvent({
    source: 'api',
    severity: Number(statusCode) >= 500 ? 'critical' : 'warning',
    endpoint,
    status_code: statusCode,
    message: `${endpoint || 'API request'} failed with ${statusCode || 'unknown status'}`,
    metadata
  })
}

let installed = false

export function installReliabilityListeners() {
  if (installed || typeof window === 'undefined') return () => {}
  installed = true

  const onError = event => {
    reportReliabilityEvent({
      source: 'frontend',
      severity: 'error',
      message: event?.message || 'Window error',
      stack: event?.error?.stack || null,
      metadata: {
        filename: event?.filename || null,
        lineno: event?.lineno || null,
        colno: event?.colno || null
      }
    })
  }

  const onUnhandled = event => {
    const reason = event?.reason
    reportReliabilityEvent({
      source: 'frontend',
      severity: 'error',
      message: reason?.message || String(reason || 'Unhandled promise rejection'),
      stack: reason?.stack || null,
      metadata: { type: 'unhandledrejection' }
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandled)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandled)
    installed = false
  }
}
