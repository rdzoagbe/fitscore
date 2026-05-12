import React from 'react'
import { useLang } from '../context/LangContext'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'

const SUPPORT_EMAIL = 'support@joblytics-ai.com'

const sections = [
  {
    title: '1. Service description',
    body: 'Joblytics AI is a web application for job seekers. It helps users compare their own CV against job postings, identify ATS keyword gaps, improve CV wording, generate cover letters, prepare for interviews, estimate salary positioning, and track job applications.'
  },
  {
    title: '2. Intended audience',
    body: 'Joblytics is intended for individual job seekers using the product for their own job search. It is not intended for recruiters, staffing agencies, employers, or HR teams to evaluate third-party candidates unless a separate written agreement is made.'
  },
  {
    title: '3. Prohibited uses',
    body: 'You must not use Joblytics to process CVs or personal data belonging to third parties without a lawful basis and their permission. You must not bulk upload candidate profiles, scrape the service, bypass usage limits, reverse-engineer the application, upload malicious files, abuse APIs, or use Joblytics for illegal or discriminatory hiring workflows.'
  },
  {
    title: '4. Account responsibility',
    body: 'You are responsible for keeping your account secure and for all activity under your account. Use a valid email address and do not share access with unauthorized users.'
  },
  {
    title: '5. AI-generated content',
    body: 'Joblytics uses AI to generate analysis, suggestions, cover letters, interview preparation, and salary guidance. AI output may be incomplete, inaccurate, outdated, or unsuitable for your situation. You are responsible for reviewing and editing all output before using it in a job application or professional communication.'
  },
  {
    title: '6. No guarantee of hiring outcome',
    body: 'Joblytics does not guarantee interviews, job offers, salary increases, ATS success, or application outcomes. Scores and recommendations are decision-support tools only.'
  },
  {
    title: '7. CV and job data',
    body: 'You remain responsible for the content you upload or paste. You confirm that you have the right to process any CV, document, or job information you submit. Joblytics does not sell your CV and is not a recruiter marketplace.'
  },
  {
    title: '8. Usage limits and fair use',
    body: 'Free and paid plans may include usage limits, such as monthly ATS analyses, cover letters, stored CVs, or other feature quotas. Usage limits are designed to protect the AI budget and service reliability. We may block, throttle, or restrict abnormal or abusive usage.'
  },
  {
    title: '9. Pricing and future payments',
    body: 'Some features may later require payment, such as a Job Search Pass or Pro Monthly plan. Prices, limits, renewal rules, and refund terms will be shown before purchase. Until payments are activated, pricing information shown in the app is a product preview and not an active billing agreement.'
  },
  {
    title: '10. Refunds and cancellations',
    body: 'When paid plans are activated, refund and cancellation terms will depend on the plan type. A non-renewing pass may not renew automatically. A subscription plan may be cancellable through a customer portal. Final terms will be shown before checkout.'
  },
  {
    title: '11. Privacy',
    body: 'Personal data is handled according to the Privacy Policy. By using Joblytics, you agree that relevant CV/job content may be processed by technical providers, including AI providers, to deliver the service.'
  },
  {
    title: '12. Service availability',
    body: 'Joblytics is provided on a best-effort basis. Features may be unavailable due to maintenance, provider outages, AI provider billing/credit issues, hosting issues, or other technical problems. We may modify, suspend, or discontinue features at any time.'
  },
  {
    title: '13. Limitation of liability',
    body: 'To the maximum extent permitted by law, Joblytics is not liable for indirect, incidental, special, consequential, or economic losses, including missed opportunities, rejected applications, employment decisions, or reliance on AI-generated content.'
  },
  {
    title: '14. Changes to these terms',
    body: 'We may update these terms as the product evolves. Continued use of Joblytics after updates means you accept the updated terms.'
  },
  {
    title: '15. Governing law and contact',
    body: `These terms are governed by French law, subject to applicable consumer protection rules. For questions, contact ${SUPPORT_EMAIL}.`
  }
]

export default function TermsPage({ onBack }) {
  const { t } = useLang()

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={onBack || (() => window.history.back())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
            ← {t('back') || 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <LangSelector />
            <ThemeToggle />
          </div>
        </div>

        <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.13em', textTransform: 'uppercase' }}>Legal</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(34px,6vw,58px)', lineHeight: .95, letterSpacing: '-.075em', fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 8px' }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
          {t('last_updated') || 'Last updated'}: {new Date().toLocaleDateString()}
        </p>

        <div style={{ padding: 18, borderRadius: 22, border: '1px solid var(--border-soft)', background: 'var(--bg-card)', marginBottom: 32 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Plain-English summary</strong>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
            Joblytics is a job-search tool for individuals. AI guidance is not a hiring guarantee. Do not use the service to screen other people’s CVs without permission.
          </p>
        </div>

        {sections.map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.78 }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
