# P7C — Typography and Copy Polish

This sprint improves the product feel without changing business logic.

## What was added

- `src/styles/joblytics-typography-polish.css`
- `scripts/apply-copy-polish.mjs`
- A global import in `src/App.jsx`

## Typography direction

Joblytics should feel like a serious career workspace, not a generic AI tool.

Recommended voice:

- Clear
- Outcome-based
- Recruiter-aware
- Trust-first
- Less generic AI language

Avoid:

- “Use AI to improve…” everywhere
- Overpromising outcomes
- Saying the app guarantees interviews
- Heavy LinkedIn automation language

Prefer:

- “Know if your CV is ready before you apply”
- “Turn a job description into an application plan”
- “Find the proof gaps recruiters may test”
- “Save the result to your career history”

## Test

Run:

```bash
npm run build
npm run qa:product
npm run qa:product:strict
```

Then check:

- `/`
- `/pricing`
- `/dashboard`
- `/linkedin`
- `/resources`
- `/roles`
- `/sample-reports`
- `/early-access`

## Notes

This patch does not import external web fonts. It uses a premium font stack and will use Inter / Plus Jakarta Sans if already available, otherwise it falls back to system fonts.
