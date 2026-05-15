import React, { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUsageSummary } from '../hooks/useUsageSummary'
import './PricingPage.css'
import LeadCaptureForm from '../components/LeadCaptureForm'
import BillingCheckoutButtons from '../components/BillingCheckoutButtons.jsx'
import '../components/BillingCheckoutButtons.css'


const billingReady = false

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: 'forever',
    badge: 'Start here',
    description: 'For testing Joblytics with a few focused applications.',
    cta: 'Open app',
    href: '/',
    highlighted: false,
    billingState: 'Available now',
    limits: ['5 ATS analyses / month', '3 cover letters / month', '2 saved CV versions'],
    features: [
      'ATS match score',
      'CV quick wins',
      'Basic history',
      'Application status tracking',
      'LinkedIn paste-only optimizer'
    ],
    notIncluded: ['Advanced exports', 'Unlimited workflow history', 'Priority AI capacity']
  },
  {
    id: 'job_search_pass',
    name: 'Job Search Pass',
    price: '€9.99',
    period: '14 days · no auto-renewal',
    badge: 'Best launch offer',
    description: 'For a focused two-week application sprint without subscription anxiety.',
    cta: billingReady ? 'Buy 14-day pass' : 'Request launch access',
    href: '/contact',
    highlighted: true,
    billingState: billingReady ? 'Stripe checkout active' : 'Checkout is being prepared',
    limits: ['100 ATS analyses / 14 days', '30 cover letters / 14 days', '10 saved CV versions'],
    features: [
      'Everything in Free',
      'Interview preparation kit',
      'Application pipeline board',
      'LinkedIn history',
      'Cover letter history',
      'Role-specific CV vault'
    ],
    notIncluded: ['Auto-renewal', 'Hidden commitment']
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: '€14.99',
    period: 'per month',
    badge: 'For active searches',
    description: 'For users applying continuously and managing several opportunities at once.',
    cta: billingReady ? 'Start Pro Monthly' : 'Join Pro waitlist',
    href: '/contact',
    highlighted: false,
    billingState: billingReady ? 'Stripe checkout active' : 'Checkout is being prepared',
    limits: ['150 ATS analyses / month', '60 cover letters / month', '20 saved CV versions'],
    features: [
      'Everything in Job Search Pass',
      'Higher monthly limits',
      'Reusable application workspace',
      'More CV versions',
      'Future salary and recruiter insights',
      'Future PDF export bundle'
    ],
    notIncluded: []
  }
]

const featureRows = [
  ['ATS job match analysis', '5 / month', '100 / pass', '150 / month'],
  ['Cover letter generation', '3 / month', '30 / pass', '60 / month'],
  ['Saved CV versions', '2', '10', '20'],
  ['LinkedIn optimization history', 'Basic', 'Included', 'Included'],
  ['Application pipeline', 'Basic', 'Included', 'Included'],
  ['Interview prep kit', 'Limited', 'Included', 'Included'],
  ['Best for', 'Trying the app', 'Two-week sprint', 'Ongoing search']
]

const billingSteps = [
  {
    title: 'Choose plan',
    detail: 'The pricing page is visually ready for Free, Job Search Pass, and Pro Monthly.'
  },
  {
    title: 'Secure checkout',
    detail: 'Stripe buttons are visually prepared but intentionally routed to launch access until products are created.'
  },
  {
    title: 'Plan activation',
    detail: 'After Stripe webhooks are connected, user_profiles.plan will update automatically.'
  }
]

function limitPercent(used, limit) {
  if (!limit || limit >= 9999) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function PlanCard({ plan, currentPlanId }) {
  const isCurrent = currentPlanId === plan.id
  const disabledCheckout = plan.id !== 'free' && !billingReady

  return (
    <article className={`pricingPro-plan ${plan.highlighted ? 'is-highlighted' : ''} ${isCurrent ? 'is-current' : ''}`}>
      <div className="pricingPro-planTop">
        <div>
          <span>{isCurrent ? 'Current plan' : plan.badge}</span>
          <h2>{plan.name}</h2>
        </div>
        <strong>{plan.price}</strong>
      </div>

      <p className="pricingPro-period">{plan.period}</p>
      <p className="pricingPro-desc">{plan.description}</p>

      <div className={`pricingPro-billingState ${disabledCheckout ? 'is-coming' : 'is-live'}`}>
        <b>{plan.billingState}</b>
        <small>{disabledCheckout ? 'No payment will be taken yet.' : 'Ready to use.'}</small>
      </div>

      <a className={plan.highlighted ? 'pricingPro-primary' : 'pricingPro-secondary'} href={plan.href}>
        {isCurrent ? 'Manage current plan' : plan.cta}
      </a>

      <div className="pricingPro-limitList">
        {plan.limits.map(item => <p key={item}>Usage · {item}</p>)}
      </div>

      <div className="pricingPro-features">
        {plan.features.map(feature => <p key={feature}>✓ {feature}</p>)}
        {plan.notIncluded.map(feature => <p key={feature} className="is-muted">— {feature}</p>)}
      </div>
    </article>
  )
}

function UsageMeter({ label, used, limit }) {
  const unlimited = limit >= 9999
  const percent = limitPercent(used, limit)
  return (
    <div className="pricingPro-meter">
      <div>
        <strong>{label}</strong>
        <span>{unlimited ? `${used} used · unlimited` : `${used} of ${limit} used`}</span>
      </div>
      {!unlimited && <i><b style={{ width: `${percent}%` }} /></i>}
    </div>
  )
}

function UpgradeRecommendation({ usage }) {
  const recommendation = useMemo(() => {
    if (!usage || usage.loading) return null
    if (usage.planId === 'admin') return 'Admin access is active. You have unrestricted testing capacity.'
    if (usage.planId === 'pro_monthly') return 'Pro is active. Keep using the full workflow: analyze, tailor, track, and prepare.'
    if (usage.analysis.remaining <= 1 || usage.coverLetters.remaining <= 1) {
      return 'You are close to your Free limits. The Job Search Pass is the best next step for an intensive application sprint.'
    }
    if (usage.cvs.remaining <= 0) {
      return 'You have reached your saved CV limit. Unlock the full workflow when you need role-specific versions for multiple job families.'
    }
    return 'Free is enough to validate the workflow. Unlock the full workflow once you start applying seriously across several roles.'
  }, [usage])

  if (!usage) return null

  return (
    <aside className="pricingPro-usageCard">
      <div>
        <p className="pricingPro-kicker">Your plan</p>
        <h2>{usage.loading ? 'Loading usage…' : usage.planLabel}</h2>
        <p>{recommendation}</p>
      </div>

      {!usage.loading && (
        <div className="pricingPro-meterGrid">
          <UsageMeter label="ATS analyses" used={usage.analysis.used} limit={usage.analysis.limit} />
          <UsageMeter label="Cover letters" used={usage.coverLetters.used} limit={usage.coverLetters.limit} />
          <UsageMeter label="Saved CVs" used={usage.cvs.used} limit={usage.cvs.limit} />
        </div>
      )}

      <footer>
        <span>{usage.resetLabel}</span>
        <a href="/limits">View detailed limits</a>
      </footer>
    </aside>
  )
}

function BillingPreview() {
  return (
    <section className="pricingPro-billingPreview">
      <div className="pricingPro-billingCopy">
        <p className="pricingPro-kicker">Billing preview</p>
        <h2>Checkout visuals are ready. Stripe is intentionally not connected yet.</h2>
        <p>
          This section gives users a professional billing experience without sending them to a broken payment flow.
          When your Stripe products and price IDs are ready, the same layout can be connected to real Checkout sessions.
        </p>
        <div className="pricingPro-billingBadges">
          <span>No live payment yet</span>
          <span>No card collection yet</span>
          <span>Stripe-ready layout</span>
        </div>
      </div>

      <div className="pricingPro-checkoutMock" aria-label="Stripe checkout preview">
        <div className="pricingPro-checkoutHeader">
          <span>Preview</span>
          <strong>Joblytics Checkout</strong>
        </div>
        <div className="pricingPro-checkoutLine"><span>Plan</span><b>Job Search Pass</b></div>
        <div className="pricingPro-checkoutLine"><span>Duration</span><b>14 days</b></div>
        <div className="pricingPro-checkoutLine"><span>Total</span><b>€9.99</b></div>
        <button type="button" disabled>Secure checkout coming soon</button>
        <small>Stripe product IDs will be linked later.</small>
      </div>

      <div className="pricingPro-billingSteps">
        {billingSteps.map((step, index) => (
          <article key={step.title}>
            <span>{index + 1}</span>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function PricingPage({ onBack }) {
  const { user } = useAuth()
  const usage = useUsageSummary()
  const currentPlanId = usage?.planId || 'free'

  return (
    <div className="pricingPro-page">
      <main className="pricingPro-shell">
        <section className="pricingPro-hero">
          <div>
            <p className="pricingPro-kicker">Pricing</p>
            <h1>Choose the right capacity for your job search.</h1>
            <p>
              Joblytics is structured around the actions that cost AI capacity and create user value:
              ATS analysis, cover letters, CV versions, LinkedIn optimization, tracking, and interview preparation.
            </p>

            <div className="pricingPro-actions">
              <button type="button" className="pricingPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <a className="pricingPro-primary" href={user ? '/' : '/'}>{user ? 'Open app' : 'Start free'}</a>
              <a className="pricingPro-secondary" href="/contact">Ask about launch access</a>
            </div>
          </div>

          <UpgradeRecommendation usage={usage} />
        </section>

        <BillingPreview />

        <section className="pricingPro-plans pricingPro-plans--three">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} currentPlanId={currentPlanId} />
          ))}
        </section>

        <section className="pricingPro-compare">
          <div>
            <p className="pricingPro-kicker">Plan comparison</p>
            <h2>Clear limits, no confusing credits.</h2>
            <p>Each plan uses plain monthly or pass-based limits so users know exactly what they can do.</p>
          </div>

          <div className="pricingPro-tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Free</th>
                  <th>Job Search Pass</th>
                  <th>Pro Monthly</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map(row => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => <td key={cell + index}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pricingPro-limits">
          <div>
            <p className="pricingPro-kicker">Feature gating</p>
            <h2>Where upgrade prompts should appear</h2>
          </div>
          <div className="pricingPro-limitGrid">
            <div><strong>At the limit</strong><span>Show upgrade prompts only when a user reaches or approaches a real plan limit.</span></div>
            <div><strong>After value</strong><span>Offer paid plans after a successful analysis, cover letter, or saved workflow action.</span></div>
            <div><strong>Not before trust</strong><span>Keep privacy-first LinkedIn and CV messaging visible before asking users to upgrade.</span></div>
          </div>
        </section>

        <section className="pricingPro-faq">
          <p className="pricingPro-kicker">FAQ</p>
          <h2>Pricing questions</h2>
          <div>
            <details open>
              <summary>Is billing active today?</summary>
              <p>No. This page is visually prepared for billing, but paid CTAs currently route to contact/early access until Stripe products are connected.</p>
            </details>
            <details>
              <summary>Why offer a 14-day pass?</summary>
              <p>Many job seekers search intensively for a short period. A non-renewing pass is easier to trust than another subscription.</p>
            </details>
            <details>
              <summary>What happens when a limit is reached?</summary>
              <p>The app should explain the current limit, show remaining usage, and offer the next plan without blocking unrelated free features.</p>
            </details>
            <details>
              <summary>What needs to be connected later?</summary>
              <p>Stripe products, price IDs, Checkout sessions, webhook signature verification, customer mapping, and automatic plan updates in Supabase.</p>
            </details>
          </div>
        </section>
      
      <LeadCaptureForm
        compact
        sourceLabel="pricing_page"
        defaultGoal="Know when checkout is available"
        title="Want to know when checkout is ready?"
        description="Leave your email and target role. We will notify you when paid plans are available and send practical examples for improving your next application."
      />
      <BillingCheckoutButtons />
    </main>
    </div>
  )
}
