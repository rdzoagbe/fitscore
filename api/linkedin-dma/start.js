function randomState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function env(name, fallback = '') {
  return process.env[name] || fallback
}

export default async function handler(req, res) {
  const clientId = env('LINKEDIN_DMA_CLIENT_ID', env('LINKEDIN_CLIENT_ID'))
  const redirectUri = env('LINKEDIN_DMA_REDIRECT_URI', 'https://fit-score-sage.vercel.app/api/linkedin-dma/callback')
  const scope = env('LINKEDIN_DMA_SCOPE', 'r_dma_portability_3rd_party')

  if (!clientId) {
    return res.status(500).json({
      success: false,
      error: 'Missing LINKEDIN_CLIENT_ID or LINKEDIN_DMA_CLIENT_ID in Vercel.'
    })
  }

  const state = randomState()

  res.setHeader(
    'Set-Cookie',
    `linkedin_dma_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  )

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', scope)

  res.writeHead(302, { Location: url.toString() })
  res.end()
}
