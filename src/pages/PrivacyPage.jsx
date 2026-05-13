import React from 'react'
import ThemeToggle from '../components/ThemeToggle'

const SUPPORT_EMAIL = 'support@joblytics-ai.com'

const sections = [
  {
    title: '1. Data controller',
    content: `Joblytics AI is a career-support web application for job seekers. For privacy questions or GDPR requests, contact us at ${SUPPORT_EMAIL}. This policy explains how Joblytics handles personal data when you use the service.`
  },
  {
    title: '2. Data we process',
    content: `We process only the data needed to provide the product:\n\n• Account data: email address, authentication identifiers, and basic profile information.\n• CV data: CV files and metadata you upload or store in your browser/device.\n• Job data: job URLs, pasted job descriptions, job titles, companies, and analysis context.\n• LinkedIn profile text: only the profile sections you voluntarily paste or upload for analysis.\n• Analysis data: ATS scores, keyword gaps, CV suggestions, cover letters, interview preparation, salary guidance, LinkedIn optimization suggestions, and application tracker notes.\n• Usage data: plan, limits, feature usage, product events, diagnostics, and error logs.\n• Support data: contact messages and diagnostic details you choose to include.`
  },
  {
    title: '3. What Joblytics does not do',
    content: `Joblytics does not ask for your LinkedIn password, does not log into LinkedIn on your behalf, does not scrape private LinkedIn pages, and does not import LinkedIn data through hidden browser automation.\n\nThe LinkedIn Optimizer works with paste/upload mode only: you choose which profile sections to provide, and Joblytics analyzes only that user-provided text.\n\nJoblytics does not sell your CV, LinkedIn profile text, job-search data, or application history.`
  },
  {
    title: '4. Purpose of processing',
    content: `Your data is used to:\n\n• Provide ATS analysis and CV/job matching.\n• Generate CV improvement suggestions, cover letters, and interview preparation.\n• Optimize user-provided LinkedIn profile sections.\n• Save your history, CV library, usage limits, and application tracker.\n• Maintain security, prevent abuse, and enforce fair-use limits.\n• Provide support and diagnose product issues.\n• Improve service reliability and product quality.\n\nJoblytics is not a recruiter marketplace and does not use your CV to resell your profile to recruiters.`
  },
  {
    title: '5. Legal basis under GDPR',
    content: `Depending on the feature, we rely on:\n\n• Contract performance: to provide the service you requested.\n• Consent: when you choose to upload files, paste profile content, submit diagnostics, or use AI features.\n• Legitimate interest: to secure the service, prevent abuse, measure reliability, and improve the product.\n• Legal obligation: if specific records must be retained by law.`
  },
  {
    title: '6. AI processing',
    content: `When you run an ATS analysis, generate a cover letter, use AI coaching features, or optimize pasted LinkedIn profile sections, relevant CV/job/profile content may be sent to an AI provider for processing. AI output is guidance only and may be inaccurate or incomplete. You should review and edit all AI-generated content before using it in a job application or publishing it online.`
  },
  {
    title: '7. Storage and retention',
    content: `Retention depends on the data type:\n\n• Account data: kept while your account is active.\n• CV files and local CV metadata: kept until you delete them or clear browser/device storage.\n• Saved analyses, profile optimizations, and tracker data: kept until you delete them or close your account.\n• Product analytics and diagnostics: kept only as long as needed for product reliability and improvement.\n• Support messages: kept as long as needed to handle your request and maintain a support record.\n\nIf you request account deletion, we aim to delete or anonymize personal data within 30 days, unless retention is legally required.`
  },
  {
    title: '8. Processors and hosting',
    content: `Joblytics may use trusted providers for hosting, authentication, database storage, AI processing, analytics, email, and infrastructure. These providers process data only to help deliver the service. Current technical providers may include Supabase, Vercel, Anthropic, and optional email/analytics providers configured for the service.`
  },
  {
    title: '9. Security',
    content: `We use reasonable technical and organizational measures, including HTTPS/TLS, authentication, access controls, row-level security where applicable, and limited backend service-role access. No internet service can guarantee absolute security, but Joblytics is designed to minimize unnecessary exposure of personal data.`
  },
  {
    title: '10. Your rights',
    content: `Under GDPR, you may have the right to:\n\n• Access your data.\n• Correct inaccurate data.\n• Delete your data.\n• Object to certain processing.\n• Restrict processing.\n• Receive a portable copy of your data.\n• Withdraw consent where processing is based on consent.\n\nTo exercise these rights, contact ${SUPPORT_EMAIL}. You may also have the right to complain to the CNIL or your local data protection authority.`
  },
  {
    title: '11. Cookies and local storage',
    content: `Joblytics uses necessary cookies/local storage for authentication, app preferences, CV storage, PWA behavior, and analytics. We do not use advertising cookies. Some CV data may be stored locally in your browser/device for privacy and performance.`
  },
  {
    title: '12. International transfers',
    content: `Some providers may process data outside France or the European Economic Area. Where required, appropriate safeguards such as contractual protections or provider compliance mechanisms are used.`
  },
  {
    title: '13. Changes to this policy',
    content: `We may update this policy as the product evolves. Material changes will be reflected on this page and, where appropriate, communicated to users.`
  }
]

export default function PrivacyPage({ onBack }) {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px 20px 60px', transition: 'background 0.3s' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={onBack || (() => window.history.back())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back
          </button>
          <ThemeToggle />
        </div>

        <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.13em', textTransform: 'uppercase' }}>Privacy, security & GDPR</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(34px,6vw,58px)', lineHeight: .95, letterSpacing: '-.075em', fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 8px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Last updated: {new Date().toLocaleDateString()}</p>

        <div style={{ padding: 18, borderRadius: 22, border: '1px solid var(--border-soft)', background: 'var(--bg-card)', marginBottom: 18 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Plain-English summary</strong>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
            Joblytics helps you improve your own job applications. We do not sell your CV, we do not ask for LinkedIn credentials, and the LinkedIn Optimizer only analyzes profile text that you choose to paste or upload.
          </p>
        </div>

        <div style={{ padding: 18, borderRadius: 22, border: '1px solid var(--border-focus)', background: 'var(--accent-soft)', marginBottom: 32 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>LinkedIn safety commitment</strong>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
            Joblytics does not request your LinkedIn password, does not log into LinkedIn, does not bypass LinkedIn access controls, and does not scrape private LinkedIn pages. Use the LinkedIn Optimizer by pasting only the profile sections you want reviewed.
          </p>
        </div>

        {sections.map(({ title, content }) => (
          <section key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.78, whiteSpace: 'pre-line' }}>{content}</p>
          </section>
        ))}

        <div style={{ marginTop: 36, padding: 18, borderRadius: 22, background: 'var(--accent-soft)', border: '1px solid var(--border-focus)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Contact for privacy or security requests</strong>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>{SUPPORT_EMAIL}</p>
        </div>
      </div>
    </div>
  )
}
