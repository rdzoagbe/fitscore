# P7E — End-to-end manual launch QA checklist

Goal: verify Joblytics AI as a real user before adding more features or promoting publicly.

## 0. Pre-checks

- [ ] Latest `main` is deployed on Vercel and deployment is Ready.
- [ ] `npm run build` passes locally.
- [ ] `npm run qa:product` passes.
- [ ] `npm run qa:product:strict` passes.
- [ ] Chrome Safe Browsing warning is gone or Search Console review is in progress.
- [ ] Test using a clean browser profile/incognito window.

## 1. Public pages

Open each page on desktop and mobile width.

- [ ] `/`
- [ ] `/pricing`
- [ ] `/resources`
- [ ] `/resources/ats-cv-checker`
- [ ] `/roles`
- [ ] `/roles/it-manager-cv-checker`
- [ ] `/sample-reports`
- [ ] `/sample-reports/it-manager-ats-report`
- [ ] `/early-access`
- [ ] `/privacy`
- [ ] `/terms`
- [ ] `/contact`

Expected:

- [ ] No red console errors.
- [ ] Navigation is neat.
- [ ] Arial font is applied.
- [ ] Buttons are readable and not cramped.
- [ ] No horizontal overflow on mobile.
- [ ] Public CTA buttons lead to the correct destination.

## 2. Early access lead capture

- [ ] Open `/early-access`.
- [ ] Submit a test lead with your own email plus `+qa`, for example `rolanddzoagbe+qa@gmail.com`.
- [ ] Confirm success message appears.
- [ ] Confirm Supabase `marketing_leads` receives the row.
- [ ] Confirm no sensitive data is requested.

## 3. Authentication and onboarding

- [ ] Sign out if already signed in.
- [ ] Sign in with your main account.
- [ ] If onboarding appears, complete it.
- [ ] Verify selected target role, seniority, goal, market, and language save to `user_profiles`.
- [ ] Refresh page and confirm onboarding does not loop.

To force onboarding again in the browser console:

```js
localStorage.removeItem('fitscore_onboarded')
```

## 4. Dashboard

- [ ] Open `/dashboard`.
- [ ] Confirm welcome title is readable and not too large.
- [ ] Confirm navigation is clean.
- [ ] Confirm career progress flow appears.
- [ ] Confirm next-best-action card appears.
- [ ] Confirm KPI cards do not show broken values such as `od`, `o`, `undefined`, or `NaN`.
- [ ] Confirm mobile view is readable.

## 5. CV versioning vault

- [ ] Open CV Coach.
- [ ] Create a CV version.
- [ ] Mark it active.
- [ ] Refresh page.
- [ ] Confirm the CV version remains visible.
- [ ] Copy CV text.
- [ ] Delete a test CV version.

Database table:

- [ ] `cv_versions`

## 6. ATS analysis with active CV

- [ ] Open Analyzer.
- [ ] Confirm active CV source card appears.
- [ ] Paste a job description.
- [ ] Run analysis without uploading a file.
- [ ] Confirm result appears.
- [ ] Confirm result is saved.
- [ ] Confirm no `/api/analyze` 500 error.
- [ ] Confirm no Supabase 400/404 errors.

Database tables:

- [ ] `analyses`
- [ ] `usage_events`

## 7. ATS analysis with uploaded CV fallback

- [ ] Turn off active CV / use upload mode.
- [ ] Upload a CV file.
- [ ] Paste a job description.
- [ ] Run analysis.
- [ ] Confirm result appears.
- [ ] Confirm no console errors.

## 8. Cover letter history

- [ ] Open CV Coach.
- [ ] Select a saved ATS analysis.
- [ ] Generate a cover letter.
- [ ] Save it to history.
- [ ] Refresh page.
- [ ] Reopen saved letter.
- [ ] Download `.txt`.
- [ ] Delete test saved letter.

Database table:

- [ ] `cover_letters`

## 9. LinkedIn Optimizer safe mode

- [ ] Open `/linkedin`.
- [ ] Confirm no LinkedIn URL field.
- [ ] Confirm no LinkedIn login/import button.
- [ ] Confirm page says paste-only/privacy-first.
- [ ] Paste profile sections.
- [ ] Run optimization.
- [ ] Save to history.
- [ ] Refresh and reopen saved result.
- [ ] Delete test result.
- [ ] Confirm no calls to `/api/auth/linkedin/me`.

Database table:

- [ ] `linkedin_optimizations`

## 10. Application pipeline / History

- [ ] Open History/Application Intelligence.
- [ ] Confirm saved analysis appears.
- [ ] Change application status.
- [ ] Add recruiter, follow-up date, notes, and next action.
- [ ] Refresh page.
- [ ] Confirm card remains in the correct column.
- [ ] Confirm mobile horizontal scroll works.

Database table:

- [ ] `applications`

## 11. Interview prep workspace

- [ ] Open History/Application Intelligence.
- [ ] Confirm Interview Readiness card appears.
- [ ] Select a saved analysis.
- [ ] Confirm questions/proof points/gaps update.
- [ ] Copy interview kit.
- [ ] Download interview kit as `.txt`.
- [ ] Open original analysis.

## 12. Pricing and billing preparation

- [ ] Open `/pricing`.
- [ ] Confirm checkout is clearly marked as prepared/not active if Stripe env vars are missing.
- [ ] Click checkout readiness/test button.
- [ ] Expected before Stripe setup: clear message saying checkout is not active yet.
- [ ] Confirm no broken Stripe redirect.
- [ ] Confirm early-access/contact CTA works.

Database table:

- [ ] `billing_events` if checkout endpoint is tested.

## 13. Admin analytics

- [ ] Sign in as `rolanddzoagbe@gmail.com`.
- [ ] Open `/admin`.
- [ ] Confirm analytics load.
- [ ] Check 7/30/90 day filters.
- [ ] Confirm no private CV, cover-letter, LinkedIn profile text, or tracker notes are exposed.

## 14. Reliability dashboard

- [ ] Open `/admin/reliability`.
- [ ] Trigger a test frontend error:

```js
window.dispatchEvent(new ErrorEvent('error', { message: 'P7E test frontend error' }))
```

- [ ] Refresh reliability dashboard.
- [ ] Confirm event appears.
- [ ] Confirm it does not store private content.

Database table:

- [ ] `reliability_events`

## 15. Technical SEO

- [ ] `/sitemap.xml` loads.
- [ ] `/robots.txt` loads and blocks `/admin` and `/api`.
- [ ] `/llms.txt` loads.
- [ ] `/seo-health.json` loads.
- [ ] `/launch-readiness.json` loads.
- [ ] Public role/resource/sample report pages have correct titles.
- [ ] Submit sitemap in Google Search Console if not done.

## 16. Mobile QA

Use Chrome DevTools device mode:

- [ ] iPhone SE width
- [ ] iPhone 14/15 width
- [ ] Samsung S series width
- [ ] iPad/tablet width

Check:

- [ ] No horizontal overflow.
- [ ] Navigation scrolls cleanly where needed.
- [ ] Forms are comfortable.
- [ ] Textareas are usable.
- [ ] Result sections are readable.
- [ ] Cards do not look crushed.

## 17. Final launch decision

Launch readiness should be blocked if any of these are true:

- [ ] Safe Browsing warning still appears.
- [ ] `/api/analyze` returns 500 in normal flow.
- [ ] Supabase 400/404 errors appear in normal flow.
- [ ] Login/onboarding loops.
- [ ] Saved history does not persist.
- [ ] Mobile dashboard has serious overflow.
- [ ] Pricing implies payment is active when Stripe is not configured.

Recommended launch decision:

- [ ] Green: no blockers, only minor copy issues.
- [ ] Amber: non-critical UI polish remains.
- [ ] Red: any blocker above remains.
