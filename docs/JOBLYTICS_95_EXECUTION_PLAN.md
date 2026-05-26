# Joblytics 9.5/10 Product Upgrade Plan

This plan turns Joblytics from a working MVP into a premium job-search operating system. The goal is to improve the product without breaking the current analyzer, CV workflows, auth, billing, history or Vercel deployment.

## Quality target

| Area | Current target | 9.5/10 definition |
|---|---:|---|
| Core idea | Strong MVP | Clear, differentiated job-search command center |
| Feature coverage | Partial platform | End-to-end flow from job capture to follow-up |
| UI polish | Mixed | Consistent, responsive, premium SaaS experience |
| Trust | Needs strengthening | Transparent AI scoring, privacy, provenance, safe rewrites |
| Competitiveness | Early | Comparable workflow value to Teal/Huntr/Jobscan/Simplify, with stronger email/calendar tracking angle |
| Monetization | Early | Clear free/pro value split and repeated weekly utility |

---

## Non-breaking execution rules

1. Preserve existing routes and API contracts unless a migration step is included.
2. Make small commits that can be tested independently.
3. Avoid rewriting large components in one pass unless the new component is isolated behind the same props.
4. Prefer additive CSS/components over destructive edits.
5. Keep `/api/analyze` backward compatible with the current frontend payload.
6. After every phase, test: sign in, analyzer, paste-mode analysis, CV builder, history, messages, billing page, mobile layout.
7. If a feature is experimental, hide it behind UI copy or a passive state before making it part of the main flow.

---

## Phase 0 — Stabilize and protect

**Goal:** stop visible glitches and make future changes safer.

### Tasks
- Keep global translation fallback so raw keys like `cv_optimize_title` never appear.
- Standardize button, card, typography and responsive spacing tokens.
- Add a visual QA checklist for every page.
- Add clearer error states for analyzer, CV import, sync and exports.
- Reduce hardcoded colors in page-specific CSS.

### Success criteria
- No raw translation keys visible.
- No broken layout on 360px, 768px, 1440px and ultrawide screens.
- Main CTA styling is consistent across Analyzer, CV Builder, Profile Optimizer and Messages.
- Analyzer still works in paste mode and URL fallback mode.

---

## Phase 1 — Product navigation and first-run flow

**Goal:** make the user journey obvious in the first 60 seconds.

### Tasks
- Add a guided dashboard checklist:
  1. Upload master CV
  2. Analyze a job
  3. Generate tailored CV
  4. Generate message/cover letter
  5. Track application
  6. Connect email/calendar sync
- Add empty states that explain what to do next.
- Make every analysis result end with one clear next action.
- Rename technical labels into user-friendly language.

### Success criteria
- New user can understand the product without help.
- Dashboard clearly shows next step.
- No feature feels isolated.

---

## Phase 2 — Analyzer trust and explainability

**Goal:** make the score credible and actionable.

### Tasks
- Redesign analysis results into factor cards:
  - ATS keyword match
  - Required skills match
  - Responsibility match
  - Seniority fit
  - Evidence strength
  - Recruiter risk
- Add confidence labels and explain what affects confidence.
- Add “Found in CV”, “Missing from CV”, and “Needs proof” sections.
- Add before/after score when the user reanalyzes after CV optimization.

### Success criteria
- User understands why they got the score.
- User knows exactly what to fix before applying.
- The product avoids fake precision.

---

## Phase 3 — CV Builder becomes a real editor

**Goal:** move from suggestions to an editable, exportable, job-specific CV workspace.

### Tasks
- Build a structured CV editor:
  - headline
  - summary
  - skills
  - experience bullets
  - education/certifications
  - tools/technologies
- Add accept/reject AI suggestions.
- Add CV versions per job.
- Add live preview and export controls.
- Add provenance labels:
  - existing CV content
  - AI rewrite
  - missing proof
  - user-confirmed content

### Success criteria
- User can create a job-specific CV without leaving Joblytics.
- Exported CV feels usable, not just a draft note.
- AI does not silently invent claims.

---

## Phase 4 — Job tracker / career CRM

**Goal:** make Joblytics useful every day, not only during analysis.

### Tasks
- Create a job tracker board:
  - Saved
  - Applied
  - Interview
  - Offer
  - Rejected
  - Archived
- Add job details:
  - company
  - role
  - salary
  - location
  - work mode
  - source URL
  - date saved
  - date applied
  - next action
  - contact
  - notes
  - CV version used
  - cover letter used
- Add reminders and follow-up prompts.
- Add quick status update from History and Messages.

### Success criteria
- User can manage their pipeline inside Joblytics.
- Job status is visible and easy to update.
- Sync data improves tracker accuracy.

---

## Phase 5 — Smart Sync as the differentiator

**Goal:** make email/calendar tracking the standout feature.

### Tasks
- Improve sync panel copy and trust messaging.
- Show detected signals by type:
  - application confirmation
  - viewed application
  - recruiter reply
  - rejection
  - interview
  - offer
  - follow-up needed
- Link each signal to a job in the tracker.
- Add suggested next action for every signal.
- Add privacy explanation: read-only, job-related scan, no sending/modifying mail.

### Success criteria
- User sees clear value after connecting mail/calendar.
- Signals update job statuses automatically or with confirmation.
- The Messages page feels like a job-search intelligence center, not a support inbox.

---

## Phase 6 — Cover letters, recruiter messages and follow-ups

**Goal:** turn analysis into communication assets.

### Tasks
- Generate role-specific cover letters.
- Generate recruiter outreach messages.
- Generate post-application follow-ups.
- Generate interview thank-you messages.
- Save every generated asset to the job record.
- Add tone choices: direct, warm, executive, concise, French, English.

### Success criteria
- User can apply faster with better communication.
- Messages are saved and reusable.
- Tone feels human, not generic AI.

---

## Phase 7 — Chrome extension / job clipper

**Goal:** remove manual copy-paste friction.

### Tasks
- Add browser extension MVP:
  - save job URL
  - scrape visible title/company/location/job description
  - send to Joblytics
  - open analysis page with prefilled data
- Add fallback manual capture when a site blocks scraping.
- Support common boards first: LinkedIn, Indeed, Welcome to the Jungle, APEC, company career pages.

### Success criteria
- User can save a job from any board in one click.
- Joblytics becomes part of the daily job-search workflow.

---

## Phase 8 — Premium conversion and pricing clarity

**Goal:** make paid value obvious.

### Tasks
- Define free/pro limits clearly:
  - free analyses
  - saved jobs
  - CV exports
  - sync frequency
  - premium messages
- Add upgrade prompts only at moments of value.
- Add billing page polish and subscription state clarity.
- Add testimonials/proof blocks later when available.

### Success criteria
- Users understand what they get for free and why Pro matters.
- Upgrade prompts feel natural, not aggressive.

---

## Phase 9 — Analytics, QA and launch readiness

**Goal:** prepare for real users and avoid regressions.

### Tasks
- Add product analytics events:
  - signup
  - first CV upload
  - first analysis
  - first export
  - first saved job
  - first sync
  - upgrade click
- Add error logging for API failures.
- Add launch checklist.
- Add a public roadmap/changelog.
- Add manual regression checklist before each deployment.

### Success criteria
- Product decisions are based on actual usage.
- Bugs are easier to diagnose.
- Each release is safer than the previous one.

---

## Recommended implementation order

1. Phase 0: stability, polish, visible glitches.
2. Phase 1: dashboard journey and next-action flow.
3. Phase 2: analyzer trust/explainability.
4. Phase 3: real CV editor/versioning.
5. Phase 4: job tracker board.
6. Phase 5: Smart Sync intelligence.
7. Phase 6: communications assets.
8. Phase 7: browser extension.
9. Phase 8: monetization clarity.
10. Phase 9: analytics and launch readiness.

---

## Regression checklist after each code phase

- Landing page loads signed out.
- Login/signup still works.
- Dashboard loads signed in.
- Analyzer paste mode returns a result.
- Analyzer URL mode handles blocked sites gracefully.
- CV upload still persists.
- CV Builder opens with and without a selected analysis.
- Profile Optimizer imports or accepts pasted profile text.
- History loads previous analyses.
- Messages page loads without requiring sync.
- Smart Sync disconnected state is understandable.
- Billing page loads.
- Mobile navigation works.
- No raw translation keys are visible.
- Browser console has no new fatal errors.
