# Joblytics Setup Checklist Before Live Paid Launch

This checklist covers the operational setup required before launching paid subscriptions.

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
PUBLIC_APP_URL=https://joblytics-ai.com
```

Optional aliases already supported by the app:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_ANON_KEY=...
```

## 2. Stripe setup

Stripe products/prices currently wired in code:

```env
STRIPE_PLUS_PRODUCT_ID=prod_UKl7YAbL55zRKl
STRIPE_PLUS_PRICE_ID=price_1TM5bZ0E2aOc1laPuYuKWqZb
STRIPE_PRO_PRODUCT_ID=prod_UKl9LjXQYpvNeb
STRIPE_PRO_PRICE_ID=price_1TM5dJ0E2aOc1laPtsjFFjac
```

Required Stripe secrets:

```env
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe webhook endpoint to create in Stripe Dashboard:

```text
https://joblytics-ai.com/api/stripe-webhook
```

Recommended webhook events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

Internal plan mapping:

```text
Stripe Joblytics AI Plus -> internal plan: starter
Stripe Joblytics AI Pro  -> internal plan: pro
```

## 3. Resend setup

1. Create or open the Resend account.
2. Add and verify the domain: `joblytics-ai.com`.
3. Create an API key.
4. Add the API key to Vercel as `RESEND_API_KEY`.
5. Confirm `CONTACT_FROM_EMAIL` uses a verified sender/domain.

Expected result: `/contact` sends directly to `admin@joblytics-ai.com` without opening Outlook or any local email app.

## 4. Supabase setup

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

## 5. Production readiness check

After Vercel redeploys, open:

```text
/api/system-check
```

This returns safe boolean readiness checks without exposing secrets.

Expected after Contact + Stripe env vars are configured:

```json
{
  "ready": {
    "ai": true,
    "auth_and_database": true,
    "direct_contact_email": true,
    "stripe": true
  }
}
```

## 6. Contact and Messages test

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

## 7. Stripe checkout test

Test in Stripe test mode first:

1. Open `/billing` as a signed-in user.
2. Tick both legal acceptance checkboxes.
3. Click the Plus/Starter paid plan.
4. Confirm redirect to Stripe Checkout.
5. Complete checkout using Stripe test card.
6. Confirm redirect back to `/billing?checkout=success`.
7. Confirm the Stripe webhook is delivered successfully.
8. Confirm Supabase user metadata is updated with `subscription_plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id` and `stripe_price_id`.
9. Confirm the user gets paid plan limits in AI endpoints.
10. Repeat for Pro.
11. Cancel a subscription in Stripe and confirm the webhook returns the user to Free.

## 8. Cache/PWA check

If old behavior appears, clear the app cache:

1. Open Chrome DevTools.
2. Go to Application.
3. Service Workers > Unregister.
4. Storage > Clear site data.
5. Reload the page.

## 9. Known remaining items before public paid launch

Business/legal details still need to be finalized:

- Legal business name
- Business form
- Registered address
- SIREN/SIRET
- VAT status
- Publication director
- Hosting provider details
- Lawyer review
