import { useEffect } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:])/gi

function decodeHtml(value = '') {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = String(value || '')
  return textarea.value
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function cleanLinkLabel(url = '', index = 0) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const jobId = parsed.pathname.match(/\/jobs\/view\/(\d+)/)?.[1]
    if (host.includes('linkedin.com')) return jobId ? `View LinkedIn job ${jobId}` : 'View LinkedIn job'
    return `Open ${host}`
  } catch {
    return `Open link ${index + 1}`
  }
}

function appendTextWithLinks(parent, text = '') {
  const parts = String(text || '').split(URL_RE)
  let linkIndex = 0
  parts.forEach(part => {
    if (!part) return
    if (/^https?:\/\//i.test(part)) {
      const link = document.createElement('a')
      link.href = part
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.className = 'mailReaderLink'
      link.textContent = cleanLinkLabel(part, linkIndex)
      linkIndex += 1
      parent.append(link)
    } else {
      parent.append(document.createTextNode(part))
    }
  })
}

function lineLooksSeparator(line = '') {
  return /^[-–—_\s]{8,}$/.test(line.trim())
}

function renderEmailLikePreview(block, raw) {
  const original = decodeHtml(raw.replace(/^Message preview\s*/i, '').trim())
  const lines = original.split(/\r?\n/)

  block.dataset.polished = 'true'
  block.textContent = ''
  block.classList.remove('cleanDomPreview')
  block.classList.add('mailReaderPreview')

  const header = document.createElement('div')
  header.className = 'mailReaderPreviewHeader'
  const headerLabel = document.createElement('span')
  headerLabel.textContent = 'Email content'
  const headerHint = document.createElement('em')
  headerHint.textContent = 'Links are clickable'
  header.append(headerLabel, headerHint)
  block.append(header)

  const body = document.createElement('div')
  body.className = 'mailReaderBody'

  lines.forEach((line, index) => {
    if (lineLooksSeparator(line)) {
      const hr = document.createElement('hr')
      body.append(hr)
      return
    }

    const paragraph = document.createElement('p')
    const trimmed = line.trim()
    if (!trimmed) paragraph.className = 'is-spacer'
    appendTextWithLinks(paragraph, line)
    body.append(paragraph)
  })

  block.append(body)
}

function renderCalendarLikePreview(block, raw) {
  const original = decodeHtml(raw.replace(/^Message preview\s*/i, '').trim())
  const lines = original.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  block.dataset.polished = 'true'
  block.textContent = ''
  block.classList.add('calendarInvitePreview')

  const title = lines[0] || 'Calendar invitation'
  const metaLines = lines.slice(1, 6)
  const description = lines.slice(6).join('\n')

  const header = document.createElement('div')
  header.className = 'calendarInviteHeader'
  const icon = document.createElement('span')
  icon.textContent = 'CAL'
  const copy = document.createElement('div')
  const label = document.createElement('p')
  label.textContent = 'Calendar invitation'
  const h3 = document.createElement('h3')
  h3.textContent = title
  copy.append(label, h3)
  header.append(icon, copy)
  block.append(header)

  if (metaLines.length) {
    const facts = document.createElement('div')
    facts.className = 'calendarInviteFacts'
    metaLines.forEach((line, index) => {
      const fact = document.createElement('div')
      const dt = document.createElement('span')
      dt.textContent = ['When', 'Where', 'Attendees', 'Organizer', 'Status'][index] || 'Detail'
      const dd = document.createElement('strong')
      appendTextWithLinks(dd, line)
      fact.append(dt, dd)
      facts.append(fact)
    })
    block.append(facts)
  }

  if (description) {
    const body = document.createElement('div')
    body.className = 'calendarInviteBody'
    description.split(/\r?\n/).forEach(line => {
      const p = document.createElement('p')
      appendTextWithLinks(p, line)
      body.append(p)
    })
    block.append(body)
  }
}

function renderReadableMessageBlocks() {
  document.querySelectorAll('.messagesStableBody:not([data-polished="true"])').forEach(block => {
    const raw = block.textContent || ''
    if (!raw || raw.trim().length < 1) return

    const parentText = block.closest('.messagesStableDetail')?.textContent || ''
    const isCalendar = /calendar|invitation|attendees|organizer|location|meeting/i.test(parentText) && !/email/i.test(parentText)
    if (isCalendar) renderCalendarLikePreview(block, raw)
    else renderEmailLikePreview(block, raw)
  })
}

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
      renderReadableMessageBlocks()
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

    observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    enhance()
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
