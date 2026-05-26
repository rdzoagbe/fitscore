import { useEffect } from 'react'

export default function SmartSyncUxBridge() {
  useEffect(() => {
    let observer
    let stopped = false

    const shouldRunForPath = () => window.location.pathname === '/messages'
    const recentSyncKey = 'joblytics_recent_smart_sync_at'
    const autoAfterConnectKey = 'joblytics_auto_run_after_connect'
    const autoOnceKey = 'joblytics_auto_sync_once_per_visit'

    const markRecentSyncIntent = () => {
      try { localStorage.setItem(recentSyncKey, new Date().toISOString()) } catch {}
    }

    const hasRecentSyncIntent = () => {
      try {
        const value = localStorage.getItem(recentSyncKey)
        if (!value) return false
        return Date.now() - new Date(value).getTime() < 10 * 60 * 1000
      } catch { return false }
    }

    const enhance = () => {
      if (stopped || !shouldRunForPath()) return
      const panel = document.querySelector('.newSyncPanel')
      if (!panel) return

      const runButton = panel.querySelector('.newSyncRunBtn.is-inline')
      const primaryButton = panel.querySelector('.newSyncConnectBtn.is-main-action')
      const results = panel.querySelector('.smartCommandCenter')
      const connected = /Mail and calendar access is active|Access active|Connected/i.test(panel.textContent || '')

      if (runButton && !runButton.dataset.bridgeBound) {
        runButton.dataset.bridgeBound = 'true'
        runButton.addEventListener('click', markRecentSyncIntent, true)
      }

      if (primaryButton && runButton) {
        primaryButton.classList.add('messagesV2PrimarySync')
        runButton.classList.add('messagesV2HiddenRun')

        if (!primaryButton.disabled && !/Working/i.test(primaryButton.textContent || '')) {
          const icon = primaryButton.querySelector('span')?.outerHTML || '<span aria-hidden="true">↻</span>'
          primaryButton.innerHTML = `${icon}${connected ? 'Refresh Smart Sync now' : 'Connect & run Smart Sync'}`
        }

        if (!primaryButton.dataset.bridgeBound) {
          primaryButton.dataset.bridgeBound = 'true'
          primaryButton.addEventListener('click', event => {
            const isConnectedNow = /Mail and calendar access is active|Access active|Connected/i.test(panel.textContent || '')
            if (isConnectedNow && runButton && !runButton.disabled) {
              event.preventDefault()
              event.stopImmediatePropagation()
              markRecentSyncIntent()
              runButton.click()
              return
            }
            try { sessionStorage.setItem(autoAfterConnectKey, '1') } catch {}
          }, true)
        }
      }

      const shouldAutoRunAfterConnect = (() => {
        try { return sessionStorage.getItem(autoAfterConnectKey) === '1' } catch { return false }
      })()

      const shouldRehydrateRecent = connected && !results && hasRecentSyncIntent() && (() => {
        try { return sessionStorage.getItem(autoOnceKey) !== '1' } catch { return true }
      })()

      if (runButton && !runButton.disabled && (shouldAutoRunAfterConnect || shouldRehydrateRecent)) {
        try {
          sessionStorage.removeItem(autoAfterConnectKey)
          sessionStorage.setItem(autoOnceKey, '1')
        } catch {}
        setTimeout(() => {
          if (!stopped && document.body.contains(runButton) && !runButton.disabled) {
            markRecentSyncIntent()
            runButton.click()
          }
        }, shouldAutoRunAfterConnect ? 650 : 900)
      }
    }

    const start = () => {
      observer = new MutationObserver(enhance)
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      enhance()
    }

    start()
    window.addEventListener('popstate', enhance)
    window.addEventListener('focus', enhance)

    return () => {
      stopped = true
      observer?.disconnect()
      window.removeEventListener('popstate', enhance)
      window.removeEventListener('focus', enhance)
    }
  }, [])

  return null
}
