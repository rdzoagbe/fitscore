# P4H — Domain Remap Preparation for joblytics-ai.com

This document prepares the controlled switch from the Vercel preview deployment to the production domain.

Do not remap `joblytics-ai.com` until P4F/P4G QA has passed.

## Current decision

The Next.js rebuild is tested on a Vercel preview URL first.

The production domain remains untouched until final approval.

## Target production domain

Canonical target:

```text
https://www.joblytics-ai.com
```

Redirect target:

```text
https://joblytics-ai.com → https://www.joblytics-ai.com
```

The app already contains a Next.js redirect from apex to `www` in `next.config.mjs`.

## 1. Vercel project preparation

Recommended clean setup:

```text
Project name: joblytics-ai-next
Repository: rdzoagbe/Joblytics-ai
Branch: phase-1-nextjs-rebuild
Root Directory: rebuild-next
Framework: Next.js
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Alternative setup:

Use the existing Vercel project, but only if you are certain the root directory is set to `rebuild-next` and the production branch points to the rebuild branch.

## 2. Vercel environment variables

Required:

```text
NEXT_PUBLIC_APP_URL=https://www.joblytics-ai.com
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>
```

Optional until final production:

```text
ANTHROPIC_API_KEY=<your Anthropic key>
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
STRIPE_SECRET_KEY=<later>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<later>
```

Payment remains inactive until Stripe is fully configured.

## 3. Supabase Auth URL configuration

Before switching the domain, update Supabase:

```text
Supabase → Authentication → URL Configuration
```

Set Site URL:

```text
https://www.joblytics-ai.com
```

Add Redirect URLs:

```text
https://www.joblytics-ai.com/auth/callback
https://joblytics-ai.com/auth/callback
http://localhost:3000/auth/callback
```

Keep the Vercel preview callback temporarily during final testing:

```text
https://<vercel-preview-url>/auth/callback
```

Remove preview URLs only after production is fully stable.

## 4. Domain attachment in Vercel

In the correct Vercel project, add:

```text
joblytics-ai.com
www.joblytics-ai.com
```

Set primary/canonical domain:

```text
www.joblytics-ai.com
```

Expected behavior:

```text
https://www.joblytics-ai.com loads the app.
https://joblytics-ai.com redirects to https://www.joblytics-ai.com.
```

## 5. DNS records

Check Vercel's exact DNS instructions in the Domains tab.

Typical Vercel setup:

Apex/root domain:

```text
Type: A
Name: @
Value: 76.76.21.21
```

WWW subdomain:

```text
Type: CNAME
Name: www
Value: cname.vercel-dns.com or the value shown by Vercel
```

Use the exact value Vercel provides if it differs.

## 6. Pre-remap blocker checklist

Do not remap if any are true:

- `npm run typecheck` fails.
- `npm run build` fails.
- Vercel preview deployment fails.
- Login fails.
- Auth callback fails.
- Dashboard fails after login.
- CV upload fails.
- ATS scanner fails.
- Tracker save/update fails.
- IPR PDF/CSV exports fail.
- Pricing implies live checkout while Stripe is inactive.
- Mobile layout has major overflow.

## 7. Remap day procedure

1. Confirm local build passes.
2. Confirm Vercel preview works.
3. Confirm Supabase production callback URLs are added.
4. Add domains to the correct Vercel project.
5. Confirm DNS records.
6. Wait for Vercel SSL to provision.
7. Open `https://www.joblytics-ai.com`.
8. Open `https://joblytics-ai.com` and confirm redirect.
9. Sign in.
10. Test one protected route.
11. Test one CV/ATS workflow.
12. Test `/pricing` and confirm checkout-safe messaging.
13. Test `/export-ipr/pdf` and `/export-ipr/csv`.

## 8. Post-remap smoke test

Public pages:

```text
/
/login
/pricing
```

Protected pages:

```text
/dashboard
/billing
/cv-enhancer
/scanner
/cover-letters
/interview
/tracker
/keywords
/analytics
/export-ipr
```

Export routes:

```text
/export-ipr/pdf
/export-ipr/csv
```

Expected:

- Public pages load.
- Protected pages require auth.
- Sign-in works.
- Logout works.
- No redirect loop.
- No Supabase 500 error.
- No broken static assets.
- No Chrome Safe Browsing warning.

## 9. Rollback plan

If production domain fails after remap:

1. Remove `joblytics-ai.com` and `www.joblytics-ai.com` from the rebuild Vercel project.
2. Reattach them to the previous working Vercel project if needed.
3. Restore Supabase Site URL to the previous production domain/project callback.
4. Keep the preview URL active for debugging.
5. Do not delete the rebuild project.

## 10. Final approval condition

Proceed with domain remap only when:

- P4F audit passes.
- P4G final QA fixes are complete.
- Preview URL works end to end.
- Supabase Auth is configured for production domain.
- Vercel root directory is confirmed as `rebuild-next`.
- You are ready for `joblytics-ai.com` to serve the Next.js rebuild.
