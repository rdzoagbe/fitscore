# P4F — Production Readiness Audit

This checklist validates Joblytics AI before remapping `joblytics-ai.com` to the Next.js rebuild.

## 1. Local build validation

Run from `rebuild-next/`:

```bash
npm run typecheck
npm run build
```

Expected:

- TypeScript passes.
- Next.js production build passes.
- No route crashes during static/dynamic generation.
- PDF/CSV export routes compile.

## 2. Vercel preview validation

Use the Vercel preview deployment for `phase-1-nextjs-rebuild`.

Do not remap the production domain until this preview passes QA.

Expected key routes:

- `/`
- `/login`
- `/pricing`
- `/dashboard`
- `/billing`
- `/cv-enhancer`
- `/scanner`
- `/cover-letters`
- `/interview`
- `/tracker`
- `/keywords`
- `/analytics`
- `/export-ipr`
- `/export-ipr/pdf`
- `/export-ipr/csv`

## 3. Public route audit

Public routes must load without requiring an authenticated session:

- `/`
- `/login`
- `/pricing`

Expected:

- Homepage loads.
- Login page loads.
- Pricing page loads.
- Pricing page says checkout is prepared but not active when Stripe is not configured.
- No payment is taken in preview mode.

## 4. Authentication audit

Check:

- Sign in works.
- Auth callback works.
- Logout works.
- Signed-out users are redirected away from protected pages.
- Signed-in users can access dashboard.
- No Supabase 500 error.
- No redirect loop.

Supabase Auth URL settings must include the active preview URL and callback URL.

## 5. Supabase schema/RLS audit

Confirm tables exist:

- `profiles`
- `cv_versions`
- `ats_analyses`
- `applications`
- `cover_letters`
- `interview_sessions`

Confirm storage exists:

- `cv-files`

Confirm RLS behavior:

- User can read/write only their own rows.
- CV upload works for authenticated users.
- Protected routes cannot leak another user's data.

## 6. Core workflow audit

Validate this full user journey:

1. Sign in.
2. Open `/dashboard`.
3. Open `/cv-enhancer`.
4. Upload a PDF/DOCX/TXT CV.
5. Confirm parsed CV appears.
6. Generate an enhanced CV.
7. Open `/scanner`.
8. Run ATS scan using parsed CV + job description.
9. Confirm scan appears in scanner history.
10. Confirm scan appears on dashboard.
11. Generate cover letter.
12. Generate interview prep.
13. Add application in tracker.
14. Update application status.
15. Open application detail page.
16. Open `/keywords`.
17. Open `/analytics`.
18. Open `/export-ipr`.
19. Download PDF export.
20. Download CSV export.

## 7. Usage limits audit

Check that usage limits are visible and enforced.

Routes/actions covered:

- ATS scans
- CV uploads
- CV enhancements
- Cover letters
- Interview prep
- Application tracking
- IPR PDF export
- IPR CSV export

Expected:

- `/billing` shows current plan and usage.
- Dashboard shows plan usage summary.
- Over-limit actions show a clean error message.
- Export routes return a controlled error if over limit.

## 8. Pricing/payment safety audit

Expected in preview:

- `/pricing` shows Free, Tier, Pro.
- Pricing limits match `lib/billing/plans.ts`.
- If Stripe env vars are missing, paid CTAs say early access / checkout not active.
- No fake checkout state.
- No payment is taken.

Real Stripe remains deferred until products and price IDs are created.

## 9. Export audit

PDF route:

```text
/export-ipr/pdf
```

Expected:

- Authenticated only.
- Downloads `joblytics-ipr-evidence.pdf`.
- Opens successfully.
- Contains French summary and evidence table.

CSV route:

```text
/export-ipr/csv
```

Expected:

- Authenticated only.
- Downloads `joblytics-ipr-evidence.csv`.
- Opens in Excel.
- French accents render correctly.
- Semicolon delimiter works for French Excel locales.

## 10. Mobile layout audit

Test mobile width for:

- `/dashboard`
- `/billing`
- `/cv-enhancer`
- `/scanner`
- `/cover-letters`
- `/interview`
- `/tracker`
- `/tracker/[id]`
- `/keywords`
- `/analytics`
- `/export-ipr`

Expected:

- No major horizontal overflow.
- Cards stack correctly.
- Tables scroll horizontally when needed.
- Navigation is usable.
- Forms and buttons are tap-friendly.

## 11. Environment variable audit

Required for preview/prod:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Optional until production launch:

```text
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

Expected:

- Without `ANTHROPIC_API_KEY`, AI flows use deterministic fallback.
- Without Stripe env vars, checkout remains inactive and safe.

## 12. Vercel project audit

Before remapping the domain:

- Root directory must be `rebuild-next`.
- Framework must be Next.js.
- Production branch must be confirmed.
- Preview URL must pass QA.
- Build command should be `npm run build`.
- Install command should be `npm install`.

## 13. Domain remap readiness

Do not remap `joblytics-ai.com` until all blockers are cleared.

Required later:

- Add `joblytics-ai.com` to the correct Vercel project.
- Add `www.joblytics-ai.com`.
- Set canonical redirect.
- Confirm DNS.
- Confirm SSL certificate.
- Confirm Supabase Auth URLs include production domain and callback.

## Production blockers

Do not launch if any are true:

- Build fails.
- Auth fails.
- Supabase RLS blocks normal user actions.
- Protected routes leak unauthenticated data.
- CV upload fails.
- ATS scanner fails.
- Tracker save/update fails.
- PDF or CSV export fails.
- Pricing implies live checkout when Stripe is not configured.
- Mobile layout is unusable.
- Custom domain is pointed to the wrong Vercel project.

## Pass condition

P4F passes when:

- Local build passes.
- Vercel preview build passes.
- Auth works.
- Core workflows work.
- Usage limits display and enforce safely.
- Pricing is payment-safe.
- PDF/CSV exports work.
- Mobile layout is acceptable.
- Domain remap is still intentionally deferred until final QA.
