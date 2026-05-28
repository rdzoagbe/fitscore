# Joblytics Launch Readiness Checklist

Use this checklist before every production release.

## 1. Deployment health

- [ ] Latest GitHub commit has a successful Vercel deployment.
- [ ] Production URL loads signed out.
- [ ] Production URL loads signed in.
- [ ] Browser console has no fatal errors.
- [ ] Mobile viewport works at 360px width.
- [ ] Tablet viewport works at 768px width.
- [ ] Desktop viewport works at 1440px width.

## 2. Core user journey

- [ ] Landing page loads.
- [ ] Sign in works.
- [ ] Dashboard loads.
- [ ] Phase 1 guided workflow appears.
- [ ] Analyzer opens.
- [ ] CV upload works.
- [ ] Paste-mode analysis works.
- [ ] URL-mode failure gives a readable fallback message.
- [ ] Analysis results show score, trust panel and next actions.
- [ ] History page loads.
- [ ] Job tracker board appears.
- [ ] Status pill updates a job stage.
- [ ] CRM notes, next action and reminder save locally.

## 3. CV and communication workflows

- [ ] CV Builder opens with a selected analysis.
- [ ] Structured CV editor appears.
- [ ] Live CV preview updates while editing.
- [ ] Save version works.
- [ ] Word export works.
- [ ] PDF export works.
- [ ] CV Coach opens.
- [ ] Communication assets card appears.
- [ ] Recruiter outreach can be generated.
- [ ] Follow-up can be generated.
- [ ] Thank-you note can be generated.
- [ ] Copy and save message actions work.

## 4. Smart Sync

- [ ] Messages / Smart Sync page loads.
- [ ] Disconnected state is clear.
- [ ] Privacy/read-only messaging is visible.
- [ ] Existing connected account state still renders.
- [ ] Smart Sync button is visible.
- [ ] Email/calendar signal tabs render if data exists.
- [ ] Email preview opens if messages exist.

## 5. Billing and legal

- [ ] Billing page loads.
- [ ] Free, Starter and Pro cards render correctly.
- [ ] Comparison table is readable.
- [ ] Starter plan opens contract modal.
- [ ] Pro plan opens contract modal.
- [ ] Legal checkboxes work.
- [ ] Stripe redirect starts.
- [ ] Terms, Privacy and Legal pages load.

## 6. Extension foundation

- [ ] `extension/manifest.json` is valid.
- [ ] Extension loads unpacked in Chrome.
- [ ] Popup opens.
- [ ] Job text extraction works on at least one job page.
- [ ] Open in Joblytics sends query parameters to Analyzer.
- [ ] Analyzer preloads clipped job text.

## 7. Diagnostics

- [ ] Local product events are recorded after an analysis.
- [ ] Local error events are recorded after a failed analysis.
- [ ] No sensitive payloads are stored in diagnostics.
- [ ] Diagnostics can be cleared if needed.

## 8. Release notes

- [ ] Update `docs/CHANGELOG.md`.
- [ ] Confirm known limitations are documented.
- [ ] Confirm next-phase priorities are documented.
