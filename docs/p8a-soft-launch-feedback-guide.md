# P8A — Soft-launch Feedback System

## Goal

Collect structured feedback from a small trusted audience before full public launch.

## What to test

1. Open the live site.
2. Click the floating **Feedback** button.
3. Submit a short UX note.
4. Confirm the row appears in Supabase table `feedback_items`.
5. Sign in as an admin.
6. Open `/admin/feedback`.
7. Confirm the feedback appears there.
8. Test mobile layout.

## Supabase SQL

Run:

```text
supabase/p8a_feedback.sql
```

Expected:

```text
Success. No rows returned.
```

## Soft-launch rules

Invite only a small trusted group first. Ask them to test:

- First impression
- Signup/login
- Dashboard clarity
- CV versioning
- ATS analysis
- Cover letter generation
- LinkedIn paste-only optimizer
- Application pipeline
- Interview prep
- Pricing clarity
- Mobile experience

## What not to ask beta testers to paste

- Sensitive employer confidential content
- Private third-party personal data
- Passwords
- Payment details
- Full private LinkedIn data if they are not comfortable sharing it

## Admin page

```text
/admin/feedback
```

The page should only be useful for the admin account because Supabase RLS restricts select access to `admin_users`.
