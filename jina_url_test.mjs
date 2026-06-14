// Diagnostic: shows exactly what your server "sees" when it reads a job URL.
// Mirrors the Jina reader path used in api/analyze-accurate.js.
// Run in Git Bash from your repo root (Node 18+):
//     node jina_url_test.mjs "https://SOME-JOB-URL"
// Tip: test TWO urls so you can compare:
//   1) a readable one (a company careers page, or a boards.greenhouse.io / jobs.lever.co posting)
//   2) a LinkedIn or Indeed job page
// If the key is set in your shell it will use it (same as production):
//     JINA_API_KEY=xxxx node jina_url_test.mjs "https://..."

const url = process.argv[2]
if (!url) { console.error('Usage: node jina_url_test.mjs "https://job-url"'); process.exit(1) }

const key = process.env.JINA_API_KEY || process.env.JINA_AI_API_KEY || process.env.JINAAI_API_KEY || ''
const headers = { 'Accept': 'text/plain', 'X-Return-Format': 'text' }
if (key) headers.Authorization = `Bearer ${key}`

const target = `https://r.jina.ai/${url}`
console.log('Reading via:', target)
console.log('Auth key present:', key ? 'yes (jina-authenticated)' : 'no (jina-public)')

try {
  const res = await fetch(target, { headers, redirect: 'follow' })
  const raw = await res.text()
  const text = raw.replace(/\u0000/g, '').trim()
  const lower = text.toLowerCase()
  const wallHit = /sign in|log in|connectez-vous|join now|verify you are human|captcha|enable javascript|access to this page has been denied|just a moment/.test(lower)

  console.log('\nHTTP status :', res.status)
  console.log('Chars        :', text.length)
  console.log('Looks walled :', wallHit ? 'YES (login / anti-bot page)' : 'no')
  console.log('\n----- first 500 chars -----\n')
  console.log(text.slice(0, 500))
  console.log('\n---------------------------\n')

  if (text.length >= 600 && !wallHit) {
    console.log('VERDICT: Real job content extracted. URL mode WILL work for this site.')
  } else if (wallHit || text.length < 200) {
    console.log('VERDICT: Walled / empty. This site blocks server readers -> use the Clipper extension or paste mode.')
  } else {
    console.log('VERDICT: Thin content. Borderline; paste mode is safer for an accurate score.')
  }
} catch (e) {
  console.log('\nRequest failed:', e?.message || e)
  console.log('VERDICT: Could not reach the reader for this URL.')
}
