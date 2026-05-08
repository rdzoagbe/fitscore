import React from 'react'
import { useAuth } from '../context/AuthContext'
import './PricingPage.css'

const currentLimits = [
  { label: 'ATS analyses', value: '5 / month free', detail: 'Paid plans increase this limit for active job searches.' },
  { label: 'Cover letters', value: '3 / month free', detail: 'Generated letters use AI and are therefore limited.' },
  { label: 'Stored CVs', value: '2 free', detail: 'Keep separate CVs for languages, roles, or seniority levels.' },
  { label: 'Job Search Pass', value: '14 days', detail: 'Designed for a short, intensive application sprint.' },
  { label: 'Hourly protection', value: 'Anti-abuse', detail: 'Prevents automated or excessive requests from draining the AI budget.' },
  { label: 'Fair use', value: 'Required', detail: 'Limits keep the service affordable and available to real job seekers.' }
]

export default function LimitsPage({ onBack }) {
  const { user } = useAuth()

  return (
    <div className="pricingPro-page">
      <main className="pricingPro-shell">
        <section className="pricingPro-hero">
          <div>
            <p className="pricingPro-kicker">Usage limits</p>
            <h1>Know exactly what you can use before you hit a cap.</h1>
            <p>
              Usage limits are not pricing. They explain quotas: how many ATS analyses, cover letters, CVs, and AI actions are available on each level.
              Pricing explains the cost; this page explains the rules.
            </p>
            <div className="pricingPro-actions">
              <button type="button" className="pricingPro-secondary" onClick={onBack || (() => window.history.back())}>← Back</button>
              <a className="pricingPro-primary" href={user ? '/' : '/'}>{user ? 'Open app' : 'Get started'}</a>
              <a className="pricingPro-secondary" href="/pricing">View pricing</a>
            </div>
          </div>
          <aside className="pricingPro-panel">
            <span>🧮</span>
            <h2>Limits protect the AI budget.</h2>
            <p>Every analysis and generated letter has a real processing cost. Fair-use limits keep Joblytics reliable.</p>
          </aside>
        </section>

        <section className="pricingPro-limits">
          <div>
            <p className="pricingPro-kicker">Current quotas</p>
            <h2>What limits control</h2>
          </div>
          <div className="pricingPro-limitGrid pricingPro-limitGrid--six">
            {currentLimits.map(item => (
              <div key={item.label}>
                <strong>{item.label}</strong>
                <span style={{ display: 'block', color: 'var(--accent)', fontWeight: 900, marginBottom: 6 }}>{item.value}</span>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pricingPro-plans">
          <article className="pricingPro-plan is-highlighted">
            <div className="pricingPro-planTop">
              <div>
                <span>Free fair use</span>
                <h2>Free</h2>
              </div>
              <strong>Low-volume</strong>
            </div>
            <p className="pricingPro-period">For testing and occasional applications</p>
            <p className="pricingPro-desc">Enough to understand how Joblytics works without creating uncontrolled AI cost.</p>
            <div className="pricingPro-features">
              <p>✓ 5 ATS analyses / month</p>
              <p>✓ 3 cover letters / month</p>
              <p>✓ 2 stored CVs</p>
              <p>✓ Basic history and status tracking</p>
            </div>
          </article>

          <article className="pricingPro-plan">
            <div className="pricingPro-planTop">
              <div>
                <span>Paid usage</span>
                <h2>Higher limits</h2>
              </div>
              <strong>Paid</strong>
            </div>
            <p className="pricingPro-period">For serious application periods</p>
            <p className="pricingPro-desc">The Job Search Pass and Pro plan increase usage for people actively applying to many roles.</p>
            <div className="pricingPro-features">
              <p>✓ 100+ ATS analyses depending on plan</p>
              <p>✓ 30+ cover letters depending on plan</p>
              <p>✓ More stored CVs</p>
              <p>✓ Exports, reminders, and deeper tracker features later</p>
            </div>
          </article>
        </section>

        <section className="pricingPro-faq">
          <p className="pricingPro-kicker">FAQ</p>
          <h2>Usage limit questions</h2>
          <div>
            <details open>
              <summary>What happens when I reach a limit?</summary>
              <p>The app should block the action and explain which limit was reached. Later, it can offer an upgrade or a job-search pass.</p>
            </details>
            <details>
              <summary>Why not unlimited free analysis?</summary>
              <p>AI processing has real cost. Unlimited free usage would make the product expensive to operate and easier to abuse.</p>
            </details>
            <details>
              <summary>Are limits the same as billing?</summary>
              <p>No. Limits are quotas and fair-use rules. Billing is payment, invoices, and subscriptions, which will be connected later.</p>
            </details>
          </div>
        </section>
      </main>
    </div>
  )
}
