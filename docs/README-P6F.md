# P6F — Technical SEO QA + DB Repair

This patch has two goals:

1. Fix the console errors:
   - `applications` table returning `404`
   - `analyses` query returning `400` because expected columns are missing

2. Add a lightweight technical SEO QA asset:
   - `public/seo-health.json`
   - `docs/p6f-technical-seo-qa.md`
   - optional Vercel SPA rewrite/header merge through the apply script

## Apply

From Git Bash:

```bash
cd "C:/Users/TheKwekuRO/Downloads/fitscore"

bash "C:/Users/TheKwekuRO/Downloads/joblytics-p6f-tech-seo-and-db-repair/apply-p6f-tech-seo-and-db-repair.sh"
```

When asked to commit and push, type:

```text
yes
```

## Supabase step

Run this SQL manually in the Supabase SQL Editor:

```text
C:\Users\TheKwekuRO\Downloads\joblytics-p6f-tech-seo-and-db-repair\supabase\p6f_db_repair.sql
```

Expected result:

```text
Success. No rows returned.
```

## Test

Open the app and confirm the console no longer shows:

```text
/rest/v1/applications ... 404
/rest/v1/analyses ... 400
```

Then test:

```text
https://joblytics-ai.com/seo-health.json
https://joblytics-ai.com/resources
https://joblytics-ai.com/roles
https://joblytics-ai.com/sample-reports
```
