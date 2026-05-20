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
    title: '3. Optional Smart Sync data',
    content: 'If you choose to activate Smart Sync, Joblytics may request read-only access to your connected email and calendar provider, such as Google, Gmail, Google Calendar, Microsoft, Outlook or Microsoft Calendar. Smart Sync is designed to process job-search related signals such as application confirmations, recruiter messages, rejections, offers, follow-ups and interview calendar events. Joblytics does not use Smart Sync to send, delete, modify or move your emails or calendar events.'
  },
  {
    title: '4. Purposes of processing',
    content: 'Data is processed to create and secure user accounts, provide ATS analysis, generate CV and cover-letter assistance, store analysis history, detect job-search updates through optional Smart Sync, summarize important job-related emails when enabled, enforce plan limits, prevent abuse, manage subscriptions, comply with legal obligations, respond to user requests and improve the service.'
  },
  {
    title: '5. Legal bases',
    content: 'Processing may rely on contract performance for core service delivery, consent for optional features or communications, legitimate interest for security, fraud prevention and service improvement, and legal obligation for accounting, tax, payment or regulatory records where applicable. Optional Smart Sync should be activated only with the user’s explicit authorization through the relevant provider consent screen.'
  },
  {
    title: '6. AI processing',
    content: 'User-provided CV, job and profile text may be sent to AI providers to generate analysis or text suggestions. If Smart Sync email summaries are enabled, selected job-related email content may be processed by an AI provider to produce a short summary, detected status and suggested action. Users should avoid uploading or syncing unnecessary sensitive data. AI output is guidance only and must be reviewed before use.'
  },
  {
    title: '7. Recipients and processors',
    content: 'Data may be processed by technical providers used for hosting, authentication, database storage, AI processing, analytics-free technical logging, email delivery and payment processing. The current architecture may include Supabase, Vercel, Anthropic and Stripe once payments are activated. Google and Microsoft may be used as authentication or optional Smart Sync providers when a user connects them.'
  },
  {
    title: '8. International transfers',
    content: 'Some providers may process data outside France or the European Economic Area. Where applicable, transfers should rely on appropriate safeguards such as adequacy decisions, Standard Contractual Clauses or equivalent legal mechanisms.'
  },
  {
    title: '9. Retention periods',
    content: 'Account data is kept while the account is active. CV files, profile text and analysis history are kept until the user deletes them or closes the account, unless a longer period is required for legal, billing, security or dispute purposes. Smart Sync detected events and summaries should be kept only as long as needed to provide job tracking history or until the user disconnects the provider or requests deletion, subject to legal retention obligations. Technical logs are kept only as long as necessary for security and service operation. Payment/accounting records may be kept for the legally required period.'
  },
  {
    title: '10. User rights and provider disconnect',
    content: 'Users may request access, rectification, deletion, restriction, objection and portability of their personal data, where applicable. Users may also withdraw consent where processing is based on consent. Smart Sync users should be able to disconnect their Google or Microsoft provider and request deletion of stored sync events. Requests can be sent to the contact address listed in this policy.'
  },
  {
    title: '11. Security',
    content: 'Joblytics uses HTTPS/TLS, account authentication, provider-side access controls, restricted service-role usage and deployment security headers. Provider tokens, where used, must be encrypted at rest and never exposed in the browser. No online service can guarantee absolute security; users should avoid uploading unnecessary sensitive data and keep their account credentials secure.'
  },
  {
    title: '12. Cookies and local storage',
    content: 'Joblytics uses technical cookies/local storage required for authentication, language preference, theme preference, device identification for usage limits and application functionality. Advertising cookies are not used unless explicitly added later with appropriate consent controls.'
  },
  {
    title: '13. Complaints',
    content: 'Users in France may contact the CNIL if they believe their data protection rights are not respected. Users should contact Joblytics first so the request can be handled quickly.'
  },
  {
    title: '14. Contact',
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