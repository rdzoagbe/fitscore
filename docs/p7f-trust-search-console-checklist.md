# P7F — Trust / Search Console / Safe Browsing Confirmation

This step confirms that Joblytics AI is safe to show to a small trusted audience.

## 1. Chrome Safe Browsing check

Open these URLs in Chrome:

- https://joblytics-ai.com/
- https://joblytics-ai.com/linkedin
- https://joblytics-ai.com/pricing
- https://joblytics-ai.com/resources
- https://joblytics-ai.com/sample-reports

Expected result:

- No red “Dangerous site” warning.
- No interstitial page.
- No warning when opening `/linkedin`.
- LinkedIn Optimizer remains paste-only.
- No LinkedIn login/import button appears.

If Chrome still shows the warning, do not launch publicly yet. Use the review note in `docs/google-safe-browsing-review-note.md`.

## 2. Google Search Console checks

In Google Search Console, verify:

- Security issues: No issues detected.
- Manual actions: No issues detected.
- Sitemaps: `https://joblytics-ai.com/sitemap.xml` submitted and readable.
- Pages: key public pages discovered/indexable.

Submit the sitemap if it is not already submitted:

```text
https://joblytics-ai.com/sitemap.xml
```

## 3. Public technical files

Open:

- https://joblytics-ai.com/robots.txt
- https://joblytics-ai.com/sitemap.xml
- https://joblytics-ai.com/seo-health.json
- https://joblytics-ai.com/launch-readiness.json
- https://joblytics-ai.com/p7e-launch-qa.json
- https://joblytics-ai.com/trust-status.json

Expected:

- `robots.txt` blocks `/api` and `/admin`.
- `sitemap.xml` includes `/resources`, `/roles`, `/sample-reports`, and `/early-access`.
- `p7e-launch-qa.json` says `ready_for_soft_launch`.
- `trust-status.json` is reachable.

## 4. LinkedIn safety confirmation

Confirm on the live site:

- No LinkedIn URL analysis field.
- No LinkedIn login button.
- No LinkedIn OAuth/import flow.
- Page clearly says paste-only / privacy-first.
- `/api/auth/linkedin/start` and `/api/linkedin-dma/start` return 404 or disabled response.

## 5. Pricing/payment safety confirmation

Until Stripe is fully configured:

- Pricing must not imply live checkout if payment is not active.
- Checkout buttons should show “prepared but not active yet” or send users to contact/early access.
- No payment should be taken.

## 6. Launch decision

Use this status logic:

```text
If Chrome warning exists: NOT READY
If Search Console security issue exists: NOT READY
If sitemap cannot be read: HOLD
If LinkedIn login/import appears: NOT READY
If payment CTAs are misleading: HOLD
If all checks pass: READY FOR SOFT LAUNCH
```

## Final note

Soft launch means testing with a small trusted group only. It is not a full public launch.
