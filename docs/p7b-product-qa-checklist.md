# P7B Product QA Checklist

Use this before adding more features or inviting real users.

## 1. Core signed-in workflow

- [ ] New user can sign up/sign in.
- [ ] Onboarding modal appears for a new user.
- [ ] Onboarding saves target role, seniority, goal, market, and language.
- [ ] Dashboard loads without console errors.
- [ ] Career progress flow appears.
- [ ] Next best action card appears.

## 2. ATS analysis

- [ ] User can analyze a pasted job description with uploaded CV.
- [ ] User can analyze using the active CV version from the CV vault.
- [ ] LinkedIn job URL failure is handled cleanly with paste fallback messaging.
- [ ] Result page shows score, verdict, missing keywords, and improvement guidance.
- [ ] Saved analysis appears in History/Application Intelligence.

## 3. CV Coach and cover letters

- [ ] CV Coach loads saved analyses.
- [ ] Cover letter generation works.
- [ ] Cover letter can be saved.
- [ ] Saved cover letter can be reopened.
- [ ] Saved cover letter can be deleted.
- [ ] Download as .txt works.

## 4. LinkedIn optimizer

- [ ] No LinkedIn URL field is visible.
- [ ] No LinkedIn login/import button is visible.
- [ ] Page states paste-only/privacy-first mode.
- [ ] Paste mode works.
- [ ] PDF/TXT upload works.
- [ ] Save to history works.
- [ ] Saved result can be reopened and deleted.

## 5. Application tracker

- [ ] Application board appears.
- [ ] Status changes persist after refresh.
- [ ] Tracker modal saves recruiter/follow-up/notes.
- [ ] Mobile board scrolls cleanly.

## 6. Admin and reliability

- [ ] /admin is visible only to the admin user.
- [ ] /admin/reliability is visible only to the admin user.
- [ ] Admin pages do not expose CV text, cover-letter text, LinkedIn profile text, or private notes.
- [ ] Fake frontend error appears in reliability events.

## 7. Public pages

- [ ] Homepage loads with polished copy.
- [ ] /resources loads.
- [ ] Every resource article loads.
- [ ] /roles loads.
- [ ] Every role landing page loads.
- [ ] /sample-reports loads.
- [ ] Every sample report loads.
- [ ] /early-access form submits.
- [ ] /pricing shows safe checkout-prepared messaging.

## 8. Technical checks

- [ ] `npm run build` passes.
- [ ] `npm run qa:product` runs.
- [ ] Browser console has no red errors on main flows.
- [ ] Supabase REST errors are gone.
- [ ] Vercel latest deployment is Ready.
- [ ] Google Search Console has no active security issue.
