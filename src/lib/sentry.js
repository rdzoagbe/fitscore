import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    release: import.meta.env.VITE_APP_VERSION || undefined,
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error exception captured',
      /^Loading chunk \d+ failed/
    ]
  })
}

export function captureError(error, context) {
  if (!dsn) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

export function setUser(user) {
  if (!dsn) return
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email })
  } else {
    Sentry.setUser(null)
  }
}
