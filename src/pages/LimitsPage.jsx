import React from 'react'
import { useAuth } from '../context/AuthContext'
import './PricingPage.css'

const plans = [
  {
    name: 'Free',
    price: '€0',
    period: 'for job seekers',
    badge: 'Live now',
    description: 'Everything you need to test your CV against real job offers and improve your applications.',
    cta: 'Start free',
    href: '/',
    highlighted: true,
    features: [
      'ATS match analysis',
      'Saved analysis history',
      'Multiple CV versions',
      'CV Coach quick wins',
      'Cover letter generation',
      'Application status tracking',
      'Light and dark mode',
      'EN / FR friendly workflow'
    ]
  },
  {
    name: 'Pro',
    price: 'Coming soon',
    period: 'for heavy job search',
    badge: 'Planned',
    description: 'More analyses, deeper tracking, exports, reminders, and advanced career intelligence.',
    cta: 'View pricing plan',
    href: '/pricing',
    highlighted: false,
    features: [
      'Higher daily analysis limits',
      'Advanced salary intelligence',
      'Interview prep exports',
      'Follow-up reminders',
      'Application notes and recruiter fields',
      'Priority AI processing',
      'PDF report exports',
      'Early access to new features'
    ]
  }
]

const faqs = [
  ['Is Joblytics free?', 'Yes. The current version is free for individual job seekers while the product is in active development.'],
  ['Do you sell CV data?', 'No. Joblytics is built for job seekers. Candidate data is not sold to recruiters, agencies, or employers.'],
  ['Why are there usage limits?', 'AI analysis has real processing costs. Limits protect the service from abuse and keep the free version available.'],
  ['Will Pro be required?', 'No. A useful free plan will remain. Pro will be for users who want higher limits and advanced workflow features.']
]

export default function LimitsPage({ onBack }) {
  const { user } = useAuth()

  return (
    <div className="pricingPro-page">
      <main className="pricingPro-shell">
        <section className="pricingPro-hero">
          <div>
            <p className="pricingPro-kicker">Limits</p>
            <h1>Start free. Upgrade only when your job search gets serious.</h1>
            <p>
              This page explains what is included today, what limits protect the service, and what Pro will unlock later.
            </p>
            <div className="pricingPro-actions">
              <button type="button" className="pricingPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <a className="pricingPro-primary" href={user ? '/' : '/'}>{user ? 'Open app' : 'Get started'}</a>
            </div>
          </div>
          <aside className="pricingPro-panel">
            <span>🛡️</span>
            <h2>Built for job seekers first.</h2>
            <p>No recruiter marketplace. No CV resale. No hidden candidate scoring.</p>
          </aside>
        </section>

        <section className="pricingPro-plans">
          {plans.map(plan => (
            <article key={plan.name} className={`pricingPro-plan ${plan.highlighted ? 'is-highlighted' : ''}`}>
              <div className="pricingPro-planTop">
                <div>
                  <span>{plan.badge}</span>
                  <h2>{plan.name}</h2>
                </div>
                <strong>{plan.price}</strong>
              </div>
              <p className="pricingPro-period">{plan.period}</p>
              <p className="pricingPro-desc">{plan.description}</p>
              <a className={plan.highlighted ? 'pricingPro-primary' : 'pricingPro-secondary'} href={plan.href}>{plan.cta}</a>
              <div className="pricingPro-features">
                {plan.features.map(feature => <p key={feature}>✓ {feature}</p>)}
              </div>
            </article>
          ))}
        </section>

        <section className="pricingPro-limits">
          <div>
            <p className="pricingPro-kicker">Current fair-use limits</p>
            <h2>Limits protect the service while keeping it useful.</h2>
          </div>
          <div className="pricingPro-limitGrid">
            <div><strong>ATS analyses</strong><span>Daily/hourly limits apply to prevent abuse.</span></div>
            <div><strong>Cover letters</strong><span>Default daily limit is active per authenticated user.</span></div>
            <div><strong>CV library</strong><span>Multiple CVs are supported in the app workflow.</span></div>
          </div>
        </section>

        <section className="pricingPro-faq">
          <p className="pricingPro-kicker">FAQ</p>
          <h2>Questions before launch</h2>
          <div>
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
