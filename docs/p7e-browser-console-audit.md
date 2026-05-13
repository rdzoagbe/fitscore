# Browser console audit helper

Open DevTools Console on each key page and look for red errors.

Record errors in this format:

```text
Page: /dashboard
Error: <paste exact red console error>
Impact: blocks / cosmetic / unknown
Screenshot: yes/no
```

Focus on:

- Supabase 400/404 errors
- `/api/*` 500 errors
- failed route chunks
- auth/session errors
- uncaught React errors
- service worker cache issues
