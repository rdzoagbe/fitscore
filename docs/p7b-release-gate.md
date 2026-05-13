# P7B Release Gate

Before moving to the next feature phase, use this gate.

## Must pass before public promotion

1. No Chrome Safe Browsing warning.
2. No red console errors on homepage, pricing, dashboard, analyzer, CV coach, LinkedIn optimizer, history, and admin pages.
3. `npm run build` passes locally and on Vercel.
4. `npm run qa:product` has no critical issues.
5. Sitemap loads and includes resources, roles, early-access, and sample reports.
6. robots.txt blocks /api and /admin.
7. Supabase tables exist and match frontend queries.
8. Pricing clearly states checkout is not live yet.
9. No LinkedIn scraping/login/import wording is visible.
10. Mobile flows are usable.

## Recommended smoke test sequence

1. Open homepage.
2. Sign in.
3. Complete onboarding.
4. Create or activate a CV version.
5. Run ATS analysis from the active CV version.
6. Generate and save cover letter.
7. Run and save LinkedIn paste-only optimization.
8. Move the saved analysis through the application pipeline.
9. Open interview prep.
10. Open admin analytics and reliability dashboards.

## Move to next phase only when

- Core flows complete without errors.
- User-facing copy is clear.
- Public pages are indexable.
- Trust issue has been fully cleared.
