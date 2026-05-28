function cleanText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function textFromSelectors(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector)
    const text = cleanText(node?.innerText || node?.textContent || '')
    if (text && text.length > 80) return text
  }
  return ''
}

function getMeta(name) {
  return document.querySelector(`meta[property="${name}"]`)?.content || document.querySelector(`meta[name="${name}"]`)?.content || ''
}

function getJsonLdJob() {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')]
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || '{}')
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed]
      while (stack.length) {
        const item = stack.shift()
        if (!item || typeof item !== 'object') continue
        const type = Array.isArray(item['@type']) ? item['@type'].join(' ') : String(item['@type'] || '')
        if (type.toLowerCase().includes('jobposting')) return item
        Object.values(item).forEach(value => {
          if (value && typeof value === 'object') {
            if (Array.isArray(value)) stack.push(...value)
            else stack.push(value)
          }
        })
      }
    } catch {}
  }
  return null
}

function extractJobFromPage() {
  const jsonLd = getJsonLdJob()
  const selectors = [
    '[data-automation="jobDescription"]',
    '[data-testid="jobDescription"]',
    '.jobs-description-content__text',
    '.show-more-less-html__markup',
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[class*="job-description"]',
    '[class*="JobDescription"]',
    'main',
    'article'
  ]

  const title = cleanText(jsonLd?.title || document.querySelector('h1')?.innerText || getMeta('og:title') || document.title)
  const company = cleanText(jsonLd?.hiringOrganization?.name || document.querySelector('[class*="company"]')?.innerText || '')
  const description = cleanText(jsonLd?.description || textFromSelectors(selectors) || getMeta('og:description'))
  const location = cleanText(
    jsonLd?.jobLocation?.address?.addressLocality ||
    jsonLd?.jobLocation?.address?.addressRegion ||
    document.querySelector('[class*="location"]')?.innerText ||
    ''
  )

  return {
    title,
    company,
    location,
    description,
    url: window.location.href,
    source: window.location.hostname,
    capturedAt: new Date().toISOString()
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'JOBLYTICS_EXTRACT_JOB') {
    sendResponse({ ok: true, job: extractJobFromPage() })
  }
  return true
})
