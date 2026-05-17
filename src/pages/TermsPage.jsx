import React from 'react'
import { useLang } from '../context/LangContext'
import { TERMS_VERSION } from '../lib/legal'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'

const sections = [
  { title: '1. Publisher and registration details', body: 'Joblytics AI is a France/EU digital service. Before paid launch, the publisher details must be completed with the legal name, registered address, SIREN/SIRET, business form, VAT status if applicable, publication director and hosting provider details. The registration details should match the INPI/Guichet unique, URSSAF and INSEE/SIRENE records.' },
  { title: '2. Service description', body: 'Joblytics AI helps job seekers analyze their own CV against job offers, improve CV wording, generate job-aligned CV drafts, prepare interviews, create cover-letter drafts and optimize LinkedIn profile text. The service provides AI-assisted guidance only and does not replace professional, legal, HR, financial or career advice.' },
  { title: '3. Intended users', body: 'The service is intended for individual job seekers using their own CV and career information. You must not use Joblytics to process third-party candidate, applicant or employee data unless you have a lawful basis, the required authorizations and a written business agreement with Joblytics.' },
  { title: '4. Account creation and legal acceptance', body: 'To create an account, you must provide accurate information and explicitly accept these Terms of Use and the Privacy Policy. Joblytics records the date, time, legal version and source of acceptance in user metadata. If the terms are updated materially, access to the workspace may be blocked until the new version is accepted.' },
  { title: '5. Subscriptions, pricing and recurring billing', body: 'Paid plans may be offered as recurring subscriptions. Before subscribing, you must explicitly accept the subscription terms, recurring billing, cancellation conditions, digital-service access rules and the Privacy Policy. Prices, plan limits and included features are shown on the Billing page before checkout.' },
  { title: '6. Withdrawal right and digital-service access', body: 'For consumers in France/EU, distance contracts may include a statutory withdrawal period. For digital services supplied immediately, the checkout flow should ask the user to request immediate access and acknowledge the applicable consequences for the withdrawal right before paid activation.' },
  { title: '7. Fair use and plan limits', body: 'Free and paid plans include usage limits. Joblytics may count usage by account, device identifier, IP hash, user-agent hash or other security signals to protect the service and enforce plan limits. Attempts to bypass limits or overload the service are prohibited.' },
  { title: '8. AI-generated output', body: 'AI outputs may be incomplete, inaccurate, biased or unsuitable for a specific employer. You remain responsible for reviewing, editing and validating every CV, cover letter, LinkedIn text, salary estimate, interview answer or recommendation before use. Joblytics does not guarantee interviews, job offers, salary increases or employment decisions.' },
  { title: '9. User content and personal data', body: 'You must only upload CVs, profile text and job-search information that belongs to you or that you are legally authorized to process. Personal data is processed according to the Privacy Policy, including purposes, legal bases, retention periods, processors, security measures and user rights under GDPR/RGPD.' },
  { title: '10. Acceptable use and security', body: 'You agree not to upload malicious files, access the service without authorization, interfere with the service, infringe intellectual property rights, impersonate others, or use Joblytics for unlawful, discriminatory or harmful purposes.' },
  { title: '11. Availability and changes', body: 'Joblytics is provided on a best-efforts basis. Features may change, be limited, suspended or discontinued for maintenance, security, legal, product or commercial reasons. We aim to communicate important changes clearly, especially for paid users.' },
  { title: '12. Liability', body: 'To the maximum extent permitted by applicable law, Joblytics is not liable for indirect losses, rejected applications, missed opportunities, employer decisions, salary negotiation outcomes, user input errors or third-party service interruptions. Nothing in these terms limits mandatory consumer rights under French or EU law.' },
  { title: '13. Termination', body: 'You may stop using the service at any time. We may suspend access if these terms are not respected or if there is a security, legal or service-integrity risk. Data deletion requests are handled according to the Privacy Policy.' },
  { title: '14. Governing law and consumer rights', body: 'These terms are governed by French law, subject to mandatory EU consumer protection rules where applicable. If you are a consumer, you may benefit from mandatory rights that cannot be waived by contract.' },
  { title: '15. Contact', body: 'For legal, privacy or subscription questions, contact: contact@joblytics-ai.com. Before paid launch, replace this with the official business contact and legal publisher details.' }
]

export default function TermsPage({ onBack }) {
  const { t, lang } = useLang()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={onBack || (() => window.history.back())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }}>← {t('back') || 'Back'}</button>
          <div style={{ display: 'flex', gap: 8 }}><LangSelector /><ThemeToggle /></div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 28, padding: 'clamp(24px,4vw,42px)', marginBottom: 28, boxShadow: '0 24px 70px var(--shadow)' }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase' }}>Legal version {TERMS_VERSION}</p>
          <h1 style={{ fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(40px,6vw,68px)', lineHeight: .95, fontWeight: 500, letterSpacing: '-.075em', color: 'var(--text-primary)', margin: '10px 0 12px' }}>Terms of Use</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>Last updated: {new Date().toLocaleDateString(locale)}. These terms are written for a France/EU SaaS context and should be reviewed by counsel before paid public launch.</p>
        </div>

        {sections.map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 22px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--accent)', marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}