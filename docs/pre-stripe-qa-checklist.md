# Joblytics Pre-Stripe QA Checklist

Use this checklist after Vercel deploys the latest commits and before adding Stripe.

## 1. Deployment and cache

- [ ] Vercel production deployment is green.
- [ ] Latest commit is deployed.
- [ ] Hard refresh the site.
- [ ] If old UI appears, unregister the service worker and clear site data.
- [ ] Open `/api/system-check` and confirm non-Stripe readiness.

## 2. Authentication

- [ ] Create account with email/password.
- [ ] Signup is blocked unless Terms/Privacy checkbox is accepted.
- [ ] Login works.
- [ ] Logout works.
- [ ] Google/LinkedIn login does not bypass legal acceptance.
- [ ] A user who has not accepted current Terms is blocked by TermsGate.

## 3. Navigation and URLs

- [ ] Dashboard shows `/dashboard`.
- [ ] Analyzer shows `/analyzer`.
- [ ] History shows `/history`.
- [ ] CV Coach shows `/coach`.
- [ ] LinkedIn Profile shows `/profile`.
- [ ] Billing shows `/billing`.
- [ ] Messages shows `/messages`.
- [ ] Contact shows `/contact`.
- [ ] Browser back/forward changes the active page correctly.
- [ ] Direct URL loading works for all main routes.

## 4. Job analysis

- [ ] Paste a full job description and the Analyze button activates.
- [ ] Paste a job URL and both URL/paste workflows behave as intended.
- [ ] Upload or paste CV content.
- [ ] Run analysis successfully.
- [ ] Error messages are clear when content is missing.
- [ ] Free-plan usage limits still apply.

## 5. CV Builder / Rebuilder

- [ ] CV Builder opens from the correct navigation path.
- [ ] It keeps the user CV as the base.
- [ ] It adds missing keywords naturally.
- [ ] It does not invent unsupported experience.
- [ ] Download output works.
- [ ] Output layout is readable on desktop and mobile.

## 6. LinkedIn Profile Optimizer

- [ ] Page opens at `/profile`.
- [ ] LinkedIn URL field is no longer shown.
- [ ] LinkedIn PDF upload works.
- [ ] Extracted PDF text fills the profile text box.
- [ ] Manual paste fallback works.
- [ ] Analyze profile works for signed-in users.
- [ ] False “Please sign in” error does not reappear.
- [ ] Results include headline, About, keywords, bullets, priority fixes and proof gaps.

## 7. Contact form

- [ ] `/contact` opens.
- [ ] Form validates email and message length.
- [ ] Send Message does not open Outlook or another email app.
- [ ] Message is sent through `/api/contact`.
- [ ] Email arrives at `admin@joblytics-ai.com`.
- [ ] Success message appears.
- [ ] View Messages button appears after successful send.
- [ ] Contact spam/rate limit blocks repeated abuse.

## 8. Messages

- [ ] `/messages` opens for signed-in users.
- [ ] Submitted contact requests appear.
- [ ] User can open a conversation.
- [ ] Message history displays correctly.
- [ ] User can send a follow-up reply.
- [ ] Reply appears in the conversation.
- [ ] Reply notification email goes to `admin@joblytics-ai.com` when Resend is configured.

## 9. Billing legal readiness

- [ ] Billing page opens at `/billing`.
- [ ] Free, Starter and Pro plans display correctly.
- [ ] Paid plans require legal checkbox.
- [ ] Paid plans require immediate digital-service access / withdrawal acknowledgement.
- [ ] Checkout button does not continue unless both are checked.
- [ ] Legal acceptance metadata is prepared for Stripe.

## 10. Legal pages

- [ ] `/terms` opens.
- [ ] `/privacy` opens.
- [ ] `/legal` opens.
- [ ] Contact email is `admin@joblytics-ai.com`.
- [ ] Legal Notice still clearly shows business details to complete later.

## 11. Mobile QA

Test on iPhone/Android:

- [ ] Navigation is usable.
- [ ] Menu closes after selection.
- [ ] Bottom navigation does not hide content.
- [ ] Contact form is readable.
- [ ] Messages page is readable.
- [ ] LinkedIn PDF upload is usable.
- [ ] Billing cards stack correctly.
- [ ] Footer does not overlap navigation.

## 12. Translation QA

- [ ] Language selector changes core pages.
- [ ] Dashboard translation is acceptable.
- [ ] Analyzer translation is acceptable.
- [ ] Billing translation is acceptable.
- [ ] Contact/Messages translation fallback is acceptable.
- [ ] Legal pages are acceptable for lawyer review.

## Go / No-Go before Stripe

Proceed to Stripe only when:

- [ ] `/api/system-check` shows AI, Supabase and direct contact email ready.
- [ ] Contact and Messages are working end-to-end.
- [ ] Navigation URLs are stable.
- [ ] Core AI features are working.
- [ ] Billing legal acceptance flow is working.
- [ ] No old PWA cache behavior remains.
