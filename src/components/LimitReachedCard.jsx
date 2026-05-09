import React from 'react'
import './LimitReachedCard.css'

export default function LimitReachedCard({ error, details, onTryPaste }) {
  if (!details || details.type !== 'limit') return null

  const used = details.used ?? '—'
  const limit = details.limit ?? '—'
  const actionLabel = details.action === 'cover letter' ? 'cover letters' : 'ATS analyses'

  return (
    <div className="limitReached-card">
      <div className="limitReached-icon">🧮</div>
      <div className="limitReached-content">
        <p className="limitReached-kicker">Usage limit reached</p>
        <h3>{error || `You’ve reached your ${details.plan} ${actionLabel} limit.`}</h3>
        <p>
          Your current plan is <strong>{details.plan}</strong>. You have used <strong>{used}</strong> of <strong>{limit}</strong> {actionLabel} for this period.
        </p>
        <div className="limitReached-actions">
          <a href="/pricing">View pricing</a>
          <a href="/limits">Usage limits</a>
          <a href="/contact">Contact support</a>
        </div>
        {onTryPaste && details.action !== 'cover letter' && (
          <button type="button" onClick={onTryPaste}>Try paste mode instead</button>
        )}
      </div>
    </div>
  )
}
