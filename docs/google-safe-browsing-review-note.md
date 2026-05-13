# Google Safe Browsing Review Note

Use this text in Google Search Console if the site is still flagged.

---

Hello,

We have reviewed and remediated the Joblytics AI site.

The issue appears to have been related to an earlier LinkedIn URL/import experiment. We have removed or disabled any behavior that could look like LinkedIn scraping, OAuth import, or credential collection.

Actions completed:

- Removed LinkedIn URL analysis from the user-facing flow.
- Removed LinkedIn login/import buttons from the LinkedIn Optimizer page.
- Removed or disabled old LinkedIn OAuth/import/DMA backend routes.
- Changed the LinkedIn Optimizer to privacy-first paste-only mode.
- Added clear user-facing language that Joblytics does not ask for LinkedIn passwords, does not log into LinkedIn, and does not scrape private LinkedIn pages.
- Verified that the application does not collect LinkedIn credentials.
- Verified that pricing/payment state is not misleading while checkout is still being prepared.
- Added robots.txt protections for private/system paths.

The current LinkedIn feature only analyzes text that users voluntarily paste or upload. The product is a career assistance tool for CV, application, LinkedIn profile text, and interview preparation.

Please review the site again.

Thank you.
