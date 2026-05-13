import React from 'react'
import { useAuth } from '../context/AuthContext'
import './PricingPage.css'

const pricingPlans = [
  {
    name: 'Free',
    price: '€0',
    period: 'forever',
    badge: 'Available now',
    description: 'For job seekers who want to try Joblytics, improve a few applications, and understand their CV match.',
    cta: 'Start free',
    href: '/',
    highlighted: false,
    features: [
      '5 ATS analyses / month',
      '3 cover letters / month',
      '2 stored CVs',
      'Basic analysis history',
      'CV Coach quick wins',
      'Application status tracking'
    ]
  },
  {
    name: 'Job Search Pass',
    price: '€9.99',
    period: '14 days, no auto-renewal',
    badge: 'Recommended launch offer',
    description: 'For an active two-week application sprint without committing to another monthly subscription.',
    cta: 'Coming soon',
    href: '/contact',
    highlighted: true,
    features: [
      '100 ATS analyses for 14 days',
      '30 cover letters for 14 days',
      '10 stored CVs',
      'CV Coach + interview prep',
      'Application tracker',
      'No auto-renewal trap'
    ]
  },
  {
    name: 'Pro Monthly',
    price: '€14.99',
    period: 'per month',
    badge: 'Planned',
    description: 'For serious job seekers who want a complete job-search cockpit with higher limits and exports.',
    cta: 'Join waitlist',
    href: '/contact',
    highlighted: false,
    features: [
      '150 ATS analyses / month',
      '60 cover letters / month',
      '20 stored CVs',
      'Advanced salary intelligence',
      'Follow-up reminders',
      'PDF report exports'
    ]
  }
]

export default function PricingPage({ onBack }) {
  const { user } = useAuth()

  return (
    <div className="pricingPro-page">
      <main className="pricingPro-shell">
        <section className="pricingPro-hero">
          <div>
            <p className="pricingPro-kicker">Pricing</p>
            <h1>Simple pricing for focused job searches.</h1>
            <p>
              Pricing is based on the AI actions that create the most value: ATS analyses, cover letters, CV coaching,
              salary insights, and interview preparation. Billing is not active yet — these plans prepare the product for launch.
            </p>
            <div className="pricingPro-actions">
              <button type="button" className="pricingPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <a className="pricingPro-primary" href={user ? '/' : '/'}>{user ? 'Open app' : 'Start free'}</a>
              <a className="pricingPro-secondary" href="/limits">View usage limits</a>
            </div>
          </div>
          <aside className="pricingPro-panel">
            <span>💳</span>
            <h2>Billing will be connected later.</h2>
            <p>Once the billing account is ready, each paid CTA can be linked to its product or price ID.</p>
          </aside>
        </section>

        <section className="pricingPro-plans pricingPro-plans--three">
          {pricingPlans.map(plan => (
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
            <p className="pricingPro-kicker">Pricing logic</p>
            <h2>What users pay for</h2>
          </div>
          <div className="pricingPro-limitGrid">
            <div><strong>AI volume</strong><span>More ATS analyses and cover letters cost more to process.</span></div>
            <div><strong>Workflow depth</strong><span>Paid plans unlock reminders, exports, notes, and salary intelligence.</span></div>
            <div><strong>Trust</strong><span>The 14-day pass avoids subscription anxiety and is easier to sell early.</span></div>
          </div>
        </section>

        <section className="pricingPro-faq">
          <p className="pricingPro-kicker">FAQ</p>
          <h2>Pricing questions</h2>
          <div>
            <details open>
              <summary>Is billing active today?</summary>
              <p>No. These plans define the commercial structure before connecting the billing provider.</p>
            </details>
            <details>
              <summary>Why offer a 14-day pass?</summary>
              <p>Many job seekers need intensive help for a short period and may prefer a non-renewing pass over a monthly subscription.</p>
            </details>
            <details>
              <summary>Will the free plan disappear?</summary>
              <p>No. A useful free plan should remain so job seekers can always test the product.</p>
            </details>
          </div>
        </section>
      </main>
    </div>
  )
}
