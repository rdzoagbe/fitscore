import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './BillingCheckoutButtons.css'

const plans = [
  {
    id: 'job_search_pass',
    title: 'Job Search Pass',
    subtitle: 'One-time access for an active job search sprint.',
    price: 'Coming soon',
    badge: 'One-time',
    features: ['Higher analysis allowance', 'Cover letter history', 'CV vault', 'Interview prep workspace']
  },
  {
    id: 'pro_monthly',
    title: 'Pro Monthly',
    subtitle: 'For ongoing applications, tracking, and role-specific CV work.',
    price: 'Coming soon',
    badge: 'Subscription',
    features: ['Full workflow access', 'Application pipeline', 'LinkedIn history', 'Priority feature access']
  }
]

export default function BillingCheckoutButtons() {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [message, setMessage] = useState('')

  const startCheckout = async (planId) => {
    setLoadingPlan(planId)
    setMessage('')

    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token

      if (!token) {
        setMessage('Please sign in before starting checkout.')
        return
      }

      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage(payload?.message || payload?.error || 'Checkout is not active yet.')
        return
      }

      if (payload?.url) {
        window.location.href = payload.url
      } else {
        setMessage('Checkout did not return a payment link. Please try again later.')
      }
    } catch (error) {
      setMessage(error?.message || 'Checkout could not be started.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section className="billing-ready-panel" aria-label="Billing checkout preparation">
      <div className="billing-ready-header">
        <span className="billing-ready-eyebrow">Billing setup</span>
        <h2>Stripe checkout is prepared, but payments stay off until your price IDs are added.</h2>
        <p>
          These buttons are wired to safe backend endpoints. Until Stripe environment variables are configured, users will see a clear “checkout not active yet” message instead of a broken payment flow.
        </p>
      </div>

      <div className="billing-ready-grid">
        {plans.map((plan) => (
          <article className="billing-ready-card" key={plan.id}>
            <div className="billing-ready-card-top">
              <span>{plan.badge}</span>
              <strong>{plan.price}</strong>
            </div>
            <h3>{plan.title}</h3>
            <p>{plan.subtitle}</p>
            <ul>
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button
              type="button"
              className="billing-ready-button"
              disabled={loadingPlan === plan.id}
              onClick={() => startCheckout(plan.id)}
            >
              {loadingPlan === plan.id ? 'Preparing checkout...' : 'Test checkout readiness'}
            </button>
          </article>
        ))}
      </div>

      {message && <div className="billing-ready-message" role="status">{message}</div>}
    </section>
  )
}
