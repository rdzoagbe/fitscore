# P6F — Technical SEO QA checklist

## Public crawl checks
- `/` loads with a clear title, description, and primary CTA.
- `/resources` loads and links to all public resource guides.
- `/roles` loads and links to role-specific landing pages.
- `/sample-reports` loads and links to synthetic sample reports.
- `/sitemap.xml` includes homepage, resources, roles, and sample reports.
- `/robots.txt` allows public pages and blocks `/admin` and `/api`.
- `/llms.txt` loads if present.

## Metadata checks
- Each public page has one clear title.
- Each public page has a unique meta description.
- Canonical URL matches the public production URL.
- Open Graph tags use production URLs.
- No public SEO page references private user data.

## SPA routing checks on Vercel
Open these directly in a private window, not through in-app navigation:
- `/resources/ats-cv-checker`
- `/roles/it-manager-cv-checker`
- `/sample-reports/it-manager-ats-report`

Each direct URL should load the React app, not a Vercel 404.

## Trust checks
- Public pages do not mention LinkedIn scraping.
- Public pages do not ask for LinkedIn login.
- Privacy copy says paste-only LinkedIn optimization.
- Admin and reliability pages are not promoted to crawlers.

## Console checks
The following errors should be gone after running the Supabase repair SQL:
- `applications 404`
- `analyses 400` caused by missing `score`, `result`, or `result_json`
