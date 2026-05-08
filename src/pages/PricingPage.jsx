import React from 'react'
import { useAuth } from '../context/AuthContext'
import './PricingPage.css'

const pricingPlans = [
  {
    name: 'Free',
    price: '€0',
    period: 'current plan',
    badge: 'Available now',
    description: 'For job seekers who want to test Joblytics, improve their CV, and track applications without paying upfront.',
    cta: 'Start free',
    href: '/',
    highlighted: true,
    features: [
      'ATS job match checks',
      'CV Coach quick wins',
      'Cover letter generation',
      'Saved analysis history',
      'Multiple CV workflow',
      'Application status tracking'
    ]
  },
  {
    name: 'Pro',
    price: 'To be decided',
    period: 'coming later',
    badge: 'Not launched yet',
    description: 'For active job seekers who need higher limits, reminders, exports, deeper salary insights, and a complete job-search cockpit.',
    cta: 'Contact / waitlist',
    href: '/contact',
    highlighted: false,
    features: [
      'Higher analysis limits',
      'Advanced salary intelligence',
      'Follow-up reminders',
      'PDF report exports',
      'Application notes and recruiter fields',
      'Priority processing when available'
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
            <h1>Pricing is simple for now: start free.</h1>
            <p>
              Joblytics is currently free while the product is being refined. Pro pricing will be decided after real usage data,
              user feedback, and AI cost validation.
            </p>
            <div className="pricingPro-actions">
              <button type="button" className="pricingPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <a className="pricingPro-primary" href={user ? '/' : '/'}>{user ? 'Open app' : 'Start free'}</a>
              <a className="pricingPro-secondary" href="/limits">View limits</a>
            </div>
          </div>
          <aside className="pricingPro-panel">
            <span>💳</span>
            <h2>No paid plan is active yet.</h2>
            <p>Free access remains available. Pro will be introduced only when the value and limits are clear.</p>
          </aside>
        </section>

        <section className="pricingPro-plans">
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
            <p className="pricingPro-kicker">Pricing decision</p>
            <h2>We should decide pricing after testing demand.</h2>
          </div>
          <div className="pricingPro-limitGrid">
            <div><strong>Usage data</strong><span>Measure how often users run ATS checks and generate cover letters.</span></div>
            <div><strong>AI costs</strong><span>Understand the real cost per active user before setting a paid price.</span></div>
            <div><strong>User value</strong><span>Price Pro only around features users actually come back for.</span></div>
          </div>
        </section>

        <section className="pricingPro-faq">
          <p className="pricingPro-kicker">FAQ</p>
          <h2>Pricing questions</h2>
          <div>
            <details open>
              <summary>Is Joblytics paid today?</summary>
              <p>No. The current product is free while the workflow is being validated.</p>
            </details>
            <details>
              <summary>When will Pro launch?</summary>
              <p>After enough real users have tested the product and the most valuable Pro features are clear.</p>
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
