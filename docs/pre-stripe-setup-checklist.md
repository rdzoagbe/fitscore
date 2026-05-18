# Joblytics Pre-Stripe Setup Checklist

This checklist covers the non-Stripe operational setup required before connecting paid subscriptions.

## 1. Vercel environment variables

Add or verify these variables in Vercel for Production and Preview where needed:

```env
ANTHROPIC_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
CONTACT_TO_EMAIL=admin@joblytics-ai.com
CONTACT_FROM_EMAIL=Joblytics <admin@joblytics-ai.com>
CONTACT_RATE_LIMIT=5
CONTACT_RATE_WINDOW_MINUTES=60
```

Optional aliases already supported by the app:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_ANON_KEY=...
```

## 2. Resend setup

1. Create or open the Resend account.
2. Add and verify the domain: `joblytics-ai.com`.
3. Create an API key.
4. Add the API key to Vercel as `RESEND_API_KEY`.
5. Confirm `CONTACT_FROM_EMAIL` uses a verified sender/domain.

Expected result: `/contact` sends directly to `admin@joblytics-ai.com` without opening Outlook or any local email app.

## 3. Supabase setup

Run this SQL file once in Supabase SQL Editor:

```text
supabase/support_messages.sql
```

It creates:

- `support_threads`
- `support_messages`
- `contact_events`
- RLS policies for user message reading
- indexes for message loading and anti-abuse checks

## 4. Production readiness check

After Vercel redeploys, open:

```text
/api/system-check
```

This returns safe boolean readiness checks without exposing secrets.

Expected before Stripe:

```json
{
  "ready": {
    "ai": true,
    "auth_and_database": true,
    "direct_contact_email": true,
    "stripe": false
  }
}
```

Stripe can remain `false` until payment integration begins.

## 5. Contact and Messages test

Test as a signed-in user:

1. Open `/contact`.
2. Send a support request.
3. Confirm no local email client opens.
4. Confirm success message appears.
5. Confirm email arrives at `admin@joblytics-ai.com`.
6. Open `/messages`.
7. Confirm the submitted request appears.
8. Open the conversation.
9. Send a follow-up reply.
10. Confirm the reply is visible in the conversation and email notification is sent.

## 6. Cache/PWA check

If old behavior appears, clear the app cache:

1. Open Chrome DevTools.
2. Go to Application.
3. Service Workers > Unregister.
4. Storage > Clear site data.
5. Reload the page.

## 7. Known remaining items before public paid launch

Business/legal details still need to be finalized:

- Legal business name
- Business form
- Registered address
- SIREN/SIRET
- VAT status
- Publication director
- Hosting provider details
- Lawyer review

Stripe integration remains separate and should be added after this checklist is green.
