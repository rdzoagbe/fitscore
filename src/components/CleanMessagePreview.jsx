import React, { useMemo } from 'react'
import './CleanMessagePreview.css'

const URL_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:])/gi

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function compactLine(value = '') {
  return decodeHtml(value)
    .replace(/\s+/g, ' ')
    .replace(/^-{3,}$/g, '')
    .trim()
}

function getCleanLinkLabel(url = '', index = 0) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    if (host.includes('linkedin.com')) {
      const match = parsed.pathname.match(/\/jobs\/view\/(\d+)/)
      return match?.[1] ? `Open LinkedIn job ${match[1]}` : 'Open LinkedIn job'
    }
    return `Open ${host}`
  } catch {
    return `Open link ${index + 1}`
  }
}

function getLinkedInJobId(url = '') {
  try {
    return new URL(url).pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || ''
  } catch { return '' }
}

function extractUrls(text = '') {
  const matches = String(text || '').match(URL_RE) || []
  const seen = new Set()
  return matches.filter(url => {
    const cleaned = url.trim()
    const jobId = getLinkedInJobId(cleaned)
    const key = jobId || cleaned.split('?')[0]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 5)
}

function cleanTextWithoutUrls(text = '') {
  return decodeHtml(text)
    .replace(URL_RE, '')
    .replace(/View job:\s*/gi, '')
    .replace(/\-{8,}/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function splitUsefulSections(text = '') {
  const raw = cleanTextWithoutUrls(text)
  const marker = /now, take these next steps|view similar jobs|jobs you may be interested|recommended jobs|you may be interested in/i
  const [main = '', ...rest] = raw.split(marker)
  return {
    main,
    suggestions: rest.join('\n').trim()
  }
}

function inferApplicationFacts(selected = {}, mainText = '') {
  const lines = mainText.split('\n').map(compactLine).filter(Boolean)
  const lowerLines = lines.map(line => line.toLowerCase())
  const applicationLine = lines.find(line => /application was sent|candidature|applied on|application received/i.test(line)) || selected.subject || selected.type
  const appliedOn = lines.find(line => /^applied on/i.test(line)) || ''
  const role = selected.role || lines.find((line, index) => index > 0 && !/^your application/i.test(line) && !/^applied on/i.test(line) && line.length < 100) || ''
  const company = selected.company || (() => {
    const idx = lowerLines.findIndex(line => line.includes('application was sent to'))
    if (idx >= 0) return lines[idx].replace(/your application was sent to/i, '').trim()
    return lines.find(line => /^[A-Z0-9][A-Za-z0-9 .&'_-]{2,}$/.test(line) && line.length < 80) || ''
  })()
  const location = lines.find(line => /paris|france|metropolitan|remote|hybrid|london|dublin|brussels/i.test(line)) || ''
  return { applicationLine, role, company, location, appliedOn }
}

function getReadableParagraphs(mainText = '') {
  const lines = mainText.split('\n').map(compactLine).filter(Boolean)
  return lines
    .filter(line => !/^view job:?$/i.test(line))
    .filter(line => !/^[-–—]+$/.test(line))
    .filter(line => !/^now, take these next steps/i.test(line))
    .slice(0, 8)
}

function getSuggestionItems(suggestions = '') {
  return suggestions
    .split('\n')
    .map(compactLine)
    .filter(Boolean)
    .filter(line => !/^view job:?$/i.test(line))
    .filter(line => !/^apply with/i.test(line))
    .slice(0, 10)
}

function buildPreview(selected = {}) {
  const source = selected.body || selected.snippet || selected.summary || ''
  const urls = extractUrls(source)
  const { main, suggestions } = splitUsefulSections(source)
  const facts = inferApplicationFacts(selected, main)
  const paragraphs = getReadableParagraphs(main)
  const suggestionItems = getSuggestionItems(suggestions)
  return { urls, facts, paragraphs, suggestionItems, hasBody: Boolean(source.trim()) }
}

export default function CleanMessagePreview({ selected }) {
  const preview = useMemo(() => buildPreview(selected), [selected])

  if (!preview.hasBody) {
    return (
      <div className="cleanPreview-empty">
        <strong>Message preview</strong>
        <p>No preview text was returned for this signal.</p>
      </div>
    )
  }

  const primaryUrl = preview.urls[0]
  const secondaryUrls = preview.urls.slice(1)

  return (
    <div className="cleanPreview">
      <div className="cleanPreview-head">
        <p>Message preview</p>
        <h3>{preview.facts.applicationLine || selected.subject || 'Detected message'}</h3>
      </div>

      <div className="cleanPreview-summary">
        <div><span>Company</span><strong>{preview.facts.company || selected.company || 'Not detected'}</strong></div>
        <div><span>Role</span><strong>{preview.facts.role || selected.role || 'Not detected'}</strong></div>
        <div><span>Location</span><strong>{preview.facts.location || 'Not detected'}</strong></div>
        <div><span>Date</span><strong>{preview.facts.appliedOn || selected.date || 'Not detected'}</strong></div>
      </div>

      {primaryUrl && (
        <a className="cleanPreview-primaryLink" href={primaryUrl} target="_blank" rel="noopener noreferrer">
          {getCleanLinkLabel(primaryUrl, 0)}
        </a>
      )}

      <div className="cleanPreview-body">
        {preview.paragraphs.map((line, index) => <p key={`${selected.id || 'preview'}-${index}`}>{line}</p>)}
      </div>

      {preview.suggestionItems.length > 0 && (
        <details className="cleanPreview-suggestions">
          <summary>Show suggested jobs from this email</summary>
          <ul>{preview.suggestionItems.map((line, index) => <li key={`suggestion-${index}`}>{line}</li>)}</ul>
        </details>
      )}

      {secondaryUrls.length > 0 && (
        <details className="cleanPreview-links">
          <summary>Other links found in this email</summary>
          <div>
            {secondaryUrls.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">{getCleanLinkLabel(url, index + 1)}</a>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
