# Smart Sync real scan engine patch

The live `api/smart-job-sync.js` currently uses the emergency fallback that prevents 500 errors but does not import emails/calendar events.

## Why users still see zeros

The production route currently returns a controlled success response after checking the Smart Sync connection. It does not decrypt provider tokens, call Gmail/Microsoft APIs, or return real `emails[]` / `calendar[]`.

## Root cause already fixed

Vercel previously failed because serverless functions did not include `api/lib/jobSignalClassifier.js` in the deployment bundle. This was fixed in `vercel.json` by adding:

```json
"functions": {
  "api/*.js": {
    "maxDuration": 60,
    "includeFiles": "api/lib/**"
  }
}
```

## Next required action

Replace `api/smart-job-sync.js` locally with the real scan engine version and push from the developer machine. The GitHub connector may block automated updates because the route decrypts provider tokens and calls Gmail/Microsoft APIs.

## Expected behavior after patch

- Smart Sync reads connected Google/Microsoft provider rows.
- It decrypts the encrypted access token server-side only.
- It scans Gmail or Outlook.
- It scans Google Calendar or Microsoft Calendar.
- It returns real `emails[]` and `calendar[]` arrays.
- It does not write to `job_tracking_events` yet.
- It shows real items in the UI instead of zeros.

## Validation checklist

1. Confirm `/api/smart-sync-health-check` returns JSON, not HTML.
2. Confirm `/api/smart-job-sync` returns HTTP 200.
3. Confirm response has `connected: true`.
4. Confirm response has non-empty `emails[]` or `calendar[]` when matching data exists.
5. Confirm `errors[]` is empty or contains provider-specific messages.
6. Only after scan-only works, enable database persistence.
