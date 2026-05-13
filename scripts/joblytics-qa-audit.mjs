import fs from 'fs'
import path from 'path'

const root = process.cwd()
const strict = process.argv.includes('--strict')
const issues = []
const warnings = []
const passes = []

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

function read(rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8') } catch { return '' }
}

function walk(dir, out = []) {
  const full = path.join(root, dir)
  if (!fs.existsSync(full)) return out
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const p = path.join(full, entry.name)
    const rel = path.relative(root, p).replaceAll('\\\\', '/')
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue
      walk(rel, out)
    } else if (/\.(js|jsx|ts|tsx|css|html|json|xml|txt|md)$/.test(entry.name)) {
      out.push(rel)
    }
  }
  return out
}

function pass(msg) { passes.push(msg) }
function warn(msg) { warnings.push(msg) }
function fail(msg) { issues.push(msg) }

console.log('\nJoblytics Product QA Audit')
console.log('='.repeat(32))

const requiredFiles = [
  'src/lib/supabase.js',
  'api/analyze.js',
  'server/_usageEvents.js',
  'server/_planLimits.js',
  'src/pages/PricingPage.jsx',
  'src/pages/CareerDashboardPage.jsx',
  'public/sitemap.xml',
  'public/robots.txt'
]

for (const file of requiredFiles) {
  exists(file) ? pass(`Required file exists: ${file}`) : fail(`Missing required file: ${file}`)
}

const optionalFeatureFiles = [
  'src/pages/LinkedInOptimizerPage.jsx',
  'src/components/CareerProgressFlow.jsx',
  'src/components/CareerNextAction.jsx',
  'src/components/BillingCheckoutButtons.jsx',
  'src/pages/AdminAnalyticsPage.jsx',
  'src/pages/AdminReliabilityPage.jsx'
]
for (const file of optionalFeatureFiles) {
  exists(file) ? pass(`Feature file exists: ${file}`) : warn(`Feature file not found, verify route if expected: ${file}`)
}

const files = walk('src').concat(walk('api')).concat(walk('server')).concat(walk('public'))

for (const rel of files) {
  const text = read(rel)
  if (text.includes('supabaseClient')) fail(`Stale Supabase import/reference found in ${rel}: use src/lib/supabase.js`)
  if (/console\.log\((?!.*PWA|.*debug)/.test(text) && rel.startsWith('src/')) warn(`Frontend console.log found in ${rel}; remove noisy logs before launch`)
  if (/TODO|FIXME|HACK/i.test(text) && !rel.startsWith('docs/')) warn(`TODO/FIXME/HACK marker found in ${rel}`)
}

const linkedInRiskPatterns = [
  /LinkedIn login/i,
  /Connect LinkedIn/i,
  /linkedin\.com\/in\//i,
  /linkedin-dma/i,
  /auth\/linkedin/i,
  /profile URL/i,
  /scrap(e|ing)/i
]
for (const rel of files.filter(f => f.startsWith('src/') || f.startsWith('api/'))) {
  const text = read(rel)
  for (const pattern of linkedInRiskPatterns) {
    if (pattern.test(text)) warn(`Review LinkedIn safety wording/reference in ${rel}: ${pattern}`)
  }
}

const app = read('src/App.jsx')
const expectedPublicRoutes = ['/resources', '/roles', '/sample-reports', '/early-access']
for (const route of expectedPublicRoutes) {
  app.includes(route) ? pass(`Route reference found: ${route}`) : warn(`Route reference not clearly found in App.jsx: ${route}`)
}

const sitemap = read('public/sitemap.xml')
const expectedSitemap = [
  '/resources',
  '/roles',
  '/sample-reports',
  '/early-access'
]
for (const item of expectedSitemap) {
  sitemap.includes(item) ? pass(`Sitemap includes: ${item}`) : warn(`Sitemap may be missing: ${item}`)
}

const robots = read('public/robots.txt')
if (robots) {
  new RegExp('Disallow:\\s*/admin', 'i').test(robots) ? pass('robots.txt blocks /admin') : warn('robots.txt should block /admin')
  new RegExp('Disallow:\\s*/api', 'i').test(robots) ? pass('robots.txt blocks /api') : warn('robots.txt should block /api')
}

const vercel = read('vercel.json')
if (vercel) {
  vercel.includes('X-Content-Type-Options') ? pass('vercel.json includes security headers') : warn('Consider adding X-Content-Type-Options header')
  vercel.includes('index.html') ? pass('vercel.json has SPA fallback/rewrite') : warn('Check SPA fallback/rewrite for public routes')
} else {
  warn('vercel.json not found; verify SPA fallback and headers in Vercel settings')
}

function printBlock(title, items, symbol) {
  console.log(`\n${title} (${items.length})`)
  console.log('-'.repeat(title.length + 4))
  if (!items.length) console.log(`${symbol} None`)
  for (const item of items) console.log(`${symbol} ${item}`)
}

printBlock('Passes', passes, '✓')
printBlock('Warnings', warnings, '⚠')
printBlock('Issues', issues, '✗')

console.log('\nRecommended manual checks:')
console.log('1. Open /, /pricing, /resources, /roles, /sample-reports, /early-access on mobile and desktop.')
console.log('2. Run one signed-in ATS analysis and confirm no console errors.')
console.log('3. Save one LinkedIn optimization, one cover letter, and one CV version.')
console.log('4. Check /admin and /admin/reliability with your admin account only.')
console.log('5. Confirm Chrome Safe Browsing warning is gone before public promotion.')

if (issues.length && strict) {
  console.error(`\nStrict mode failed with ${issues.length} issue(s).`)
  process.exit(1)
}

console.log('\nQA audit completed.')
