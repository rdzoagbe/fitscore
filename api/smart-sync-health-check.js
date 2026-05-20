export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  return res.status(200).json({
    ok: true,
    route: 'smart-sync-health-check',
    message: 'API route is reachable. If this returns JSON, Vercel API routing is working.',
    timestamp: new Date().toISOString()
  })
}
