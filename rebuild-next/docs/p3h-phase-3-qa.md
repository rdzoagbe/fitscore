# P3H — Phase 3 QA and Browser Testing

This checklist validates the Phase 3 Tracker & Intelligence layer before production/domain remapping.

## Build validation

Run from `rebuild-next/`:

```bash
npm run typecheck
npm run build
```

Expected:

- TypeScript passes.
- Next.js production build passes.
- Routes are generated for:
  - `/dashboard`
  - `/tracker`
  - `/tracker/[id]`
  - `/keywords`
  - `/analytics`
  - `/export-ipr`
  - `/export-ipr/pdf`
  - `/export-ipr/csv`

## Browser QA URL

Use the Vercel preview deployment URL for this branch until the production domain is remapped.

Do not remap `joblytics-ai.com` until this checklist passes.

## Authentication

1. Open the preview URL.
2. Sign in.
3. Confirm protected pages redirect to `/login` when signed out.
4. Confirm dashboard loads after sign-in.
5. Confirm logout works and returns to `/login`.

Expected:

- No Supabase 500 error.
- No auth loop.
- User name/email appears in the sidebar.

## Tracker QA

Open `/tracker`.

1. Add an application with:
   - company
   - job title
   - platform
   - status
   - optional job URL
   - optional job description
2. Confirm the application appears in the correct Kanban column.
3. Change the status from the card.
4. Refresh the page.
5. Confirm the updated status persists.
6. Click the application title.
7. Confirm `/tracker/[id]` opens.

Expected:

- Application cards show company, role, status health, days open, and next action.
- Status update persists in Supabase.
- Detail page shows job description and status intelligence.

## Application detail QA

Open one application detail page.

Check:

- Company and job title are correct.
- Status is correct.
- Days open is calculated.
- Health label appears.
- Recommended next action appears.
- Pipeline health indicators render.
- Original job link opens in a new tab when present.
- Status update form works.

## Keyword intelligence QA

Before testing `/keywords`, run at least one ATS scan from `/scanner`.

Open `/keywords`.

Expected:

- Coverage score is calculated.
- Critical gaps count appears.
- Matched keyword list appears if ATS scan has matched terms.
- Missing keyword list appears if ATS scan has gaps.
- Recommended keyword actions appear.
- Empty state appears if no scans exist.

## Analytics QA

Open `/analytics`.

Expected:

- Total applications uses tracker data.
- Response rate is calculated.
- Interview/test rate is calculated.
- Offer rate is calculated.
- Rejection rate is calculated.
- Top platform appears when applications have platform values.
- Weekly trend appears when application dates exist.
- Performance insights are shown.

## Dashboard integration QA

Open `/dashboard`.

Expected:

- Active applications count uses tracker data.
- Response rate uses analytics data.
- Latest ATS score uses saved ATS analyses.
- Average ATS score is calculated.
- Application conversion funnel renders.
- Latest ATS breakdown renders.
- Priority insight renders.
- Recent applications render with health label and next action.
- Latest ATS analyses render.

## IPR export QA

Open `/export-ipr`.

Expected:

- Days tracked is calculated.
- Application count is correct.
- Average per week is calculated.
- Dossier status appears.
- Evidence categories appear:
  - Réponse positive / entretien
  - Offre / proposition
  - Réponse négative
  - Sans réponse
  - Candidature envoyée
  - À suivre

## PDF export QA

Open:

```text
/export-ipr/pdf
```

Expected:

- Browser downloads `joblytics-ipr-evidence.pdf`.
- PDF opens.
- PDF contains summary table.
- PDF contains application evidence table.
- No unauthenticated access.

## CSV export QA

Open:

```text
/export-ipr/csv
```

Expected:

- Browser downloads `joblytics-ipr-evidence.csv`.
- File opens in Excel.
- French accents display correctly.
- Columns are separated correctly.
- Summary and evidence rows are present.

## Mobile QA

Test these pages on mobile width:

- `/dashboard`
- `/tracker`
- `/tracker/[id]`
- `/keywords`
- `/analytics`
- `/export-ipr`

Expected:

- No horizontal overflow.
- Cards stack correctly.
- Tables scroll horizontally where needed.
- Bottom mobile navigation remains usable.
- Buttons are large enough to tap.

## Blockers

Do not proceed to production/domain remapping if any of these exist:

- Auth loop.
- Supabase 500 error during login.
- Tracker status does not persist.
- Dashboard crashes with empty data.
- PDF route crashes.
- CSV route crashes.
- Mobile layout has major overflow.
- Protected routes are visible while signed out.

## Pass condition

Phase 3 is ready when:

- Build passes.
- Auth works.
- Tracker works.
- Dashboard reflects tracker/ATS data.
- Keywords page reflects ATS history.
- Analytics reflects application tracker data.
- IPR PDF/CSV export downloads successfully.
- Mobile layout is usable.
