# P7A Stripe checkout preparation

This patch prepares Joblytics AI for Stripe without requiring live Stripe products yet.

## Environment variables to add later in Vercel

```text
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_JOB_SEARCH_PASS=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
SUPABASE_URL=https://rzpvnktdjxkmxowxnqhg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_APP_URL=https://joblytics-ai.com
```

## Stripe products to create later

1. Job Search Pass — one-time payment.
2. Pro Monthly — recurring subscription.

## Stripe webhook endpoint

```text
https://joblytics-ai.com/api/billing/stripe-webhook
```

Subscribe to these events first:

```text
checkout.session.completed
customer.subscription.deleted
customer.subscription.updated
invoice.payment_failed
```

## Safety behavior before Stripe is configured

The checkout endpoint returns `501 stripe_not_configured` with a clear user-facing message. No payment is taken and no Stripe page opens until the Stripe variables are added.
