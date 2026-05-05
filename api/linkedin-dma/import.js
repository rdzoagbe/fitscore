function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(Boolean)
      .map(cookie => {
        const index = cookie.indexOf('=')
        if (index === -1) return [cookie, '']
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))]
      })
  )
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': process.env.LINKEDIN_DMA_API_VERSION || '202312',
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json'
  }
}

async function triggerAuthorization(token) {
  try {
    await fetch('https://api.linkedin.com/rest/memberAuthorizations', {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  } catch {
    // Non-blocking. Snapshot data can still be attempted.
  }
}

async function fetchDomain(token, domain) {
  const url = new URL('https://api.linkedin.com/rest/memberSnapshotData')
  url.searchParams.set('q', 'criteria')
  url.searchParams.set('domain', domain)
  url.searchParams.set('start', '0')
  url.searchParams.set('count', '100')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(token)
  })

  const text = await response.text()
  let data = null

  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    return {
      domain,
      success: false,
      status: response.status,
      error: data?.message || data?.error || text || `LinkedIn returned ${response.status}`
    }
  }

  return {
    domain,
    success: true,
    data
  }
}

function flattenSnapshot(domainResult) {
  if (!domainResult.success) {
    return `## ${domainResult.domain}\nUnable to import: ${domainResult.error}\n`
  }

  const elements = domainResult.data?.elements || []
  const rows = []

  for (const element of elements) {
    if (Array.isArray(element.snapshotData)) {
      rows.push(...element.snapshotData)
    } else if (element.snapshotData) {
      rows.push(element.snapshotData)
    } else {
      rows.push(element)
    }
  }

  if (!rows.length) {
    return `## ${domainResult.domain}\nNo data returned yet.\n`
  }

  return [
    `## ${domainResult.domain}`,
    ...rows.map((row, index) => {
      return `### Item ${index + 1}\n${JSON.stringify(row, null, 2)}`
    })
  ].join('\n\n')
}

export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie || '')
    const token = cookies.linkedin_dma_access

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No LinkedIn DMA access token found. Click “Import full LinkedIn profile” first.'
      })
    }

    await triggerAuthorization(token)

    const requestUrl = new URL(req.url, `https://${req.headers.host || 'fit-score-sage.vercel.app'}`)
    const requestedDomains = requestUrl.searchParams.get('domains')

    const domains = requestedDomains
      ? requestedDomains.split(',').map(value => value.trim()).filter(Boolean)
      : ['PROFILE', 'POSITIONS', 'EDUCATION', 'SKILLS', 'CERTIFICATIONS']

    const results = []

    for (const domain of domains) {
      results.push(await fetchDomain(token, domain))
    }

    const successful = results.filter(result => result.success)
    const profileText = results.map(flattenSnapshot).join('\n\n')

    if (!successful.length) {
      return res.status(502).json({
        success: false,
        error: 'LinkedIn authorization worked, but no snapshot data was returned yet. Try again in 10 minutes. Some LinkedIn DMA data can take time to become available.',
        results
      })
    }

    return res.status(200).json({
      success: true,
      domains,
      profileText,
      results
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'LinkedIn DMA import failed.'
    })
  }
}
