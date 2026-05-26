import { useEffect } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:])/gi

function cleanLine(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/^-{3,}$/g, '')
    .trim()
}

function cleanLinkLabel(url = '', index = 0) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const jobId = parsed.pathname.match(/\/jobs\/view\/(\d+)/)?.[1]
    if (host.includes('linkedin.com')) return jobId ? `Open LinkedIn job ${jobId}` : 'Open LinkedIn job'
    return `Open ${host}`
  } catch {
    return `Open link ${index + 1}`
  }
}

function uniqueLinks(text = '') {
  const seen = new Set()
  return (String(text || '').match(URL_RE) || []).filter(url => {
    let key = url
    try {
      const parsed = new URL(url)
      key = parsed.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || `${parsed.hostname}${parsed.pathname}`
    } catch {}
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 5)
}

function polishMessagePreviewBlocks() {
  document.querySelectorAll('.messagesStableBody:not([data-polished="true"])').forEach(block => {
    const raw = block.textContent || ''
    if (!raw || raw.length < 120 || !/https?:\/\//i.test(raw)) return

    const original = raw.replace(/^Message preview\s*/i, '').trim()
    const links = uniqueLinks(original)
    const withoutLinks = original
      .replace(URL_RE, '')
      .replace(/View job:\s*/gi, '')
      .replace(/-{8,}/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const split = withoutLinks.split(/now, take these next steps|view similar jobs|jobs you may be interested|recommended jobs|you may be interested in/i)
    const mainText = split[0] || withoutLinks
    const suggestions = split.slice(1).join('\n').trim()
    const lines = mainText.split('\n').map(cleanLine).filter(Boolean).slice(0, 8)
    const suggestionLines = suggestions.split('\n').map(cleanLine).filter(Boolean).filter(line => !/^apply with/i.test(line)).slice(0, 10)

    const applicationLine = lines.find(line => /application was sent|candidature|applied on|application received/i.test(line)) || 'Job-related message detected'
    const appliedOn = lines.find(line => /^applied on/i.test(line)) || ''
    const company = (() => {
      const sentLine = lines.find(line => /application was sent to/i.test(line))
      if (sentLine) return sentLine.replace(/your application was sent to/i, '').trim()
      return lines.find(line => /^[A-Z0-9][A-Za-z0-9 .&'_-]{2,}$/.test(line) && line.length < 80) || 'Not detected'
    })()
    const role = lines.find((line, idx) => idx > 0 && !/^your application/i.test(line) && !/^applied on/i.test(line) && line !== company && line.length < 100) || 'Not detected'
    const location = lines.find(line => /paris|france|metropolitan|remote|hybrid|london|dublin|brussels/i.test(line)) || 'Not detected'

    block.dataset.polished = 'true'
    block.textContent = ''
    block.classList.add('cleanDomPreview')

    const head = document.createElement('div')
    head.className = 'cleanDomPreview-head'
    const label = document.createElement('p')
    label.textContent = 'Message preview'
    const title = document.createElement('h3')
    title.textContent = applicationLine
    head.append(label, title)

    const summary = document.createElement('div')
    summary.className = 'cleanDomPreview-summary'
    ;[
      ['Company', company],
      ['Role', role],
      ['Location', location],
      ['Date', appliedOn || 'Not detected']
    ].forEach(([key, value]) => {
      const card = document.createElement('div')
      const span = document.createElement('span')
      span.textContent = key
      const strong = document.createElement('strong')
      strong.textContent = value
      card.append(span, strong)
      summary.append(card)
    })

    block.append(head, summary)

    if (links[0]) {
      const primary = document.createElement('a')
      primary.className = 'cleanDomPreview-primaryLink'
      primary.href = links[0]
      primary.target = '_blank'
      primary.rel = 'noopener noreferrer'
      primary.textContent = cleanLinkLabel(links[0], 0)
      block.append(primary)
    }

    const body = document.createElement('div')
    body.className = 'cleanDomPreview-body'
    lines.filter(line => !/^view job:?$/i.test(line)).forEach(line => {
      const p = document.createElement('p')
      p.textContent = line
      body.append(p)
    })
    block.append(body)

    if (suggestionLines.length) {
      const details = document.createElement('details')
      details.className = 'cleanDomPreview-details'
      const summaryNode = document.createElement('summary')
      summaryNode.textContent = 'Show suggested jobs from this email'
      const ul = document.createElement('ul')
      suggestionLines.forEach(line => {
        const li = document.createElement('li')
        li.textContent = line
        ul.append(li)
      })
      details.append(summaryNode, ul)
      block.append(details)
    }

    if (links.length > 1) {
      const details = document.createElement('details')
      details.className = 'cleanDomPreview-details cleanDomPreview-links'
      const summaryNode = document.createElement('summary')
      summaryNode.textContent = 'Other links found in this email'
      const div = document.createElement('div')
      links.slice(1).forEach((url, index) => {
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.textContent = cleanLinkLabel(url, index + 1)
        div.append(a)
      })
      details.append(summaryNode, div)
      block.append(details)
    }
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
      polishMessagePreviewBlocks()
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
