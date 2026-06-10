function cleanText(value = '') {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function textFromSelectors(selectors) {
  const candidates = []
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach(node => {
      const text = cleanText(node?.innerText || node?.textContent || '')
      if (text && text.length > 80) candidates.push(text)
    })
  }
  return candidates.sort((a, b) => b.length - a.length)[0] || ''
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
          if (value && typeof value === 'object') Array.isArray(value) ? stack.push(...value) : stack.push(value)
        })
      }
    } catch {}
  }
  return null
}

function clickLinkedInShowMore() {
  const buttons = [...document.querySelectorAll('button')]
  const showMore = buttons.find(button => /show more|voir plus|afficher plus|see more/i.test(button.innerText || button.textContent || ''))
  try { showMore?.click() } catch {}
}

function getLinkedInDescription() {
  clickLinkedInShowMore()
  return textFromSelectors([
    '.jobs-description__content',
    '.jobs-description-content__text',
    '.jobs-box__html-content',
    '.show-more-less-html__markup',
    '.jobs-description',
    '[class*="jobs-description"]',
    '[class*="show-more-less-html"]'
  ])
}

function getLinkedInTitle() {
  return cleanText(
    document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText ||
    document.querySelector('.jobs-unified-top-card__job-title')?.innerText ||
    document.querySelector('h1')?.innerText ||
    getMeta('og:title') ||
    document.title
  )
}

function getLinkedInCompany() {
  return cleanText(
    document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText ||
    document.querySelector('.jobs-unified-top-card__company-name')?.innerText ||
    document.querySelector('.job-details-jobs-unified-top-card__primary-description-container a')?.innerText ||
    document.querySelector('[class*="company-name"]')?.innerText ||
    ''
  )
}

function getLinkedInLocation() {
  const topCard = cleanText(
    document.querySelector('.job-details-jobs-unified-top-card__primary-description-container')?.innerText ||
    document.querySelector('.jobs-unified-top-card__primary-description')?.innerText ||
    document.querySelector('[class*="primary-description"]')?.innerText ||
    ''
  )
  const parts = topCard.split(/\n|·/).map(cleanText).filter(Boolean)
  return parts.find(part => /france|paris|london|remote|hybrid|onsite|ile-de-france|île-de-france/i.test(part)) || ''
}

function extractJobFromPage() {
  const jsonLd = getJsonLdJob()
  const host = window.location.hostname
  const isLinkedIn = host.includes('linkedin.com')

  const genericSelectors = [
    '[data-automation="jobDescription"]',
    '[data-testid="jobDescription"]',
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[class*="job-description"]',
    '[class*="JobDescription"]',
    'article',
    'main'
  ]

  const title = isLinkedIn
    ? getLinkedInTitle()
    : cleanText(jsonLd?.title || document.querySelector('h1')?.innerText || getMeta('og:title') || document.title)

  const company = isLinkedIn
    ? getLinkedInCompany()
    : cleanText(jsonLd?.hiringOrganization?.name || document.querySelector('[class*="company"]')?.innerText || '')

  const description = isLinkedIn
    ? cleanText(getLinkedInDescription() || jsonLd?.description || getMeta('og:description'))
    : cleanText(jsonLd?.description || textFromSelectors(genericSelectors) || getMeta('og:description'))

  const location = isLinkedIn
    ? getLinkedInLocation()
    : cleanText(jsonLd?.jobLocation?.address?.addressLocality || jsonLd?.jobLocation?.address?.addressRegion || document.querySelector('[class*="location"]')?.innerText || '')

  return { title, company, location, description, url: window.location.href, source: host, capturedAt: new Date().toISOString(), extractor: isLinkedIn ? 'linkedin-dom' : 'generic-dom' }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'JOBLYTICS_EXTRACT_JOB') sendResponse({ ok: true, job: extractJobFromPage() })
  return true
})
