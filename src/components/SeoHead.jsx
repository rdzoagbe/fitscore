import { useEffect } from 'react'

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function upsertJsonLd(id, data) {
  let el = document.head.querySelector(`script[data-seo-id="${id}"]`)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.setAttribute('data-seo-id', id)
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export default function SeoHead({ title, description, canonical, type = 'website', image = 'https://joblytics-ai.com/og-image.svg', jsonLd }) {
  useEffect(() => {
    if (title) document.title = title
    if (description) upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow, max-image-preview:large' })
    if (canonical) upsertLink('canonical', canonical)

    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    if (canonical) upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    if (title) upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    if (description) upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Joblytics AI' })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    if (title) upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    if (description) upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })

    if (jsonLd) upsertJsonLd('joblytics-page-jsonld', jsonLd)
  }, [title, description, canonical, type, image, jsonLd])

  return null
}
