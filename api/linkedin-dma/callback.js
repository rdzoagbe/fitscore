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

function env(name, fallback = '') {
  return process.env[name] || fallback
}

function redirect(res, location) {
  res.writeHead(302, { Location: location })
  res.end()
}

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url, `https://${req.headers.host || 'fit-score-sage.vercel.app'}`)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')

    if (error) {
      return redirect(res, `/linkedin?linkedin_dma_error=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!code) {
      return redirect(res, '/linkedin?linkedin_dma_error=missing_code')
    }

    const cookies = parseCookies(req.headers.cookie || '')
    if (!state || !cookies.linkedin_dma_state || state !== cookies.linkedin_dma_state) {
      return redirect(res, '/linkedin?linkedin_dma_error=invalid_state')
    }

    const clientId = env('LINKEDIN_DMA_CLIENT_ID', env('LINKEDIN_CLIENT_ID'))
    const clientSecret = env('LINKEDIN_DMA_CLIENT_SECRET', env('LINKEDIN_CLIENT_SECRET'))
    const redirectUri = env('LINKEDIN_DMA_REDIRECT_URI', 'https://fit-score-sage.vercel.app/api/linkedin-dma/callback')

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'Missing LinkedIn DMA client credentials in Vercel.'
      })
    }

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    })

    const tokenData = await tokenResponse.json().catch(() => ({}))

    if (!tokenResponse.ok || !tokenData.access_token) {
      return redirect(
        res,
        `/linkedin?linkedin_dma_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_exchange_failed')}`
      )
    }

    const maxAge = Number(tokenData.expires_in || 5184000)

    res.setHeader('Set-Cookie', [
      'linkedin_dma_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
      `linkedin_dma_access=${encodeURIComponent(tokenData.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
    ])

    return redirect(res, '/linkedin?linkedin_dma=connected')
  } catch (err) {
    return redirect(res, `/linkedin?linkedin_dma_error=${encodeURIComponent(err.message || 'callback_failed')}`)
  }
}
