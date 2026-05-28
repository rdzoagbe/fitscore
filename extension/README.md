# Joblytics Job Clipper

Phase 7 foundation for a Chrome extension that clips job descriptions and opens them in Joblytics Analyzer.

## What it does

- Reads the current job page when the user clicks the extension.
- Extracts title, company, location, URL and job description where possible.
- Allows the user to review/edit the extracted text.
- Opens Joblytics Analyzer with the job text prefilled.
- Does not send data automatically.

## Local install for testing

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `extension` folder from this repository.
6. Open a job page.
7. Click the Joblytics extension icon.
8. Click **Open in Joblytics**.

## Analyzer URL

The popup default is:

```txt
https://joblytics-ai.vercel.app/analyzer
```

If your Vercel production URL is different, paste the correct `/analyzer` URL in the popup settings and click **Save URL**.

## Notes

This is a foundation build. It is intentionally separate from the Vite app and should not affect Vercel builds.
