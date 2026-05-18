import React from 'react'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'
import { useLang } from '../context/LangContext'
import { PRIVACY_VERSION } from '../lib/legal'

const sections = [
  {
    title: '1. Data controller',
    content: 'Joblytics AI is responsible for the processing of personal data collected through the service. Before paid public launch, this section must be completed with the official legal name, address, SIREN/SIRET, admin@joblytics-ai.com and, if applicable, VAT status and DPO/contact person.'
  },
  {
    title: '2. Data we collect',
    content: 'We may process: account email, authentication provider identifiers, uploaded CV files, extracted CV text, job URLs, pasted job descriptions, ATS analysis results, LinkedIn profile text pasted by the user, generated cover letters, billing plan status, legal acceptance metadata, usage events, device identifier, hashed IP address, hashed user-agent and technical security logs.'
  },
  {
    title: '3. Purposes of processing',
    content: 'Data is processed to create and secure user accounts, provide ATS analysis, generate CV and cover-letter assistance, store analysis history, enforce plan limits, prevent abuse, manage subscriptions, comply with legal obligations, respond to user requests and improve the service.'
  },
  {
    title: '4. Legal bases',
    content: 'Processing may rely on contract performance for core service delivery, consent for optional features or communications, legitimate interest for security, fraud prevention and service improvement, and legal obligation for accounting, tax, payment or regulatory records where applicable.'
  },
  {
    title: '5. AI processing',
    content: 'User-provided CV, job and profile text may be sent to AI providers to generate analysis or text suggestions. Users should avoid uploading unnecessary sensitive data. AI output is guidance only and must be reviewed before use.'
  },
  {
    title: '6. Recipients and processors',
    content: 'Data may be processed by technical providers used for hosting, authentication, database storage, AI processing, analytics-free technical logging, email delivery and payment processing. The current architecture may include Supabase, Vercel, Anthropic and Stripe once payments are activated.'
  },
  {
    title: '7. International transfers',
    content: 'Some providers may process data outside France or the European Economic Area. Where applicable, transfers should rely on appropriate safeguards such as adequacy decisions, Standard Contractual Clauses or equivalent legal mechanisms.'
  },
  {
    title: '8. Retention periods',
    content: 'Account data is kept while the account is active. CV files, profile text and analysis history are kept until the user deletes them or closes the account, unless a longer period is required for legal, billing, security or dispute purposes. Technical logs are kept only as long as necessary for security and service operation. Payment/accounting records may be kept for the legally required period.'
  },
  {
    title: '9. User rights',
    content: 'Users may request access, rectification, deletion, restriction, objection and portability of their personal data, where applicable. Users may also withdraw consent where processing is based on consent. Requests can be sent to the contact address listed in this policy.'
  },
  {
    title: '10. Security',
    content: 'Joblytics uses HTTPS/TLS, account authentication, provider-side access controls and restricted service-role usage. No online service can guarantee absolute security; users should avoid uploading unnecessary sensitive data and keep their account credentials secure.'
  },
  {
    title: '11. Cookies and local storage',
    content: 'Joblytics uses technical cookies/local storage required for authentication, language preference, theme preference, device identification for usage limits and application functionality. Advertising cookies are not used unless explicitly added later with appropriate consent controls.'
  },
  {
    title: '12. Complaints',
    content: 'Users in France may contact the CNIL if they believe their data protection rights are not respected. Users should contact Joblytics first so the request can be handled quickly.'
  },
  {
    title: '13. Contact',
    content: 'Privacy contact: admin@joblytics-ai.com. Before paid launch, complete the Legal Notice page with official business and publisher details.'
  }
]

export default function PrivacyPage({ onBack }) {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px 20px 60px', transition: 'background 0.3s' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={onBack || (() => window.history.back())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← {t('back') || 'Back'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <LangSelector />
            <ThemeToggle />
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 28, padding: 'clamp(24px,4vw,42px)', marginBottom: 28, boxShadow: '0 24px 70px var(--shadow)' }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase' }}>Privacy version {PRIVACY_VERSION}</p>
          <h1 style={{ fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(38px,6vw,64px)', lineHeight: .95, fontWeight: 500, letterSpacing: '-.075em', color: 'var(--text-primary)', margin: '10px 0 12px' }}>
            Privacy Policy & GDPR
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            Last updated: {new Date().toLocaleDateString(locale)}. This policy is prepared for a France/EU SaaS context and must be reviewed before paid public launch.
          </p>
        </div>

        {sections.map(({ title, content }) => (
          <section key={title} style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 22px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{content}</p>
          </section>
        ))}
      </div>
    </div>
  )
}