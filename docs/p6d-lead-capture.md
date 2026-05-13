# P6D - Public Lead Capture / Early Access

This patch adds a public early-access form and stores leads in Supabase.

## Added

- `/early-access` public page
- `LeadCaptureForm` component
- Footer link to Early access
- Supabase table: `marketing_leads`
- Privacy-safe copy for public lead capture

## Data collected

- Email
- Target role
- Job-search goal
- Target market
- Optional context
- Source page/source label
- User agent truncated to 300 characters

Do not collect CV text, LinkedIn content, job descriptions, or cover-letter content in this table.

## Next step

Later, connect this table to:

- Email newsletter tool
- Admin lead view
- Stripe launch notification
- Lifecycle emails
