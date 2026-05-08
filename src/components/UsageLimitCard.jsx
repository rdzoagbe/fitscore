import React from 'react'
import { getUsagePercent } from '../utils/planLimits'

function UsageRow({ label, used, limit }) {
  const unlimited = limit >= 9999
  const percent = getUsagePercent(used, limit)
  return (
    <div className="usageLimit-row">
      <div>
        <strong>{label}</strong>
        <span>{unlimited ? `${used} used · Unlimited` : `${used} / ${limit} used`}</span>
      </div>
      <em>{unlimited ? '∞' : `${Math.max(0, limit - used)} left`}</em>
      {!unlimited && <i><b style={{ width: `${percent}%` }} /></i>}
    </div>
  )
}

export default function UsageLimitCard({ usage, compact = false }) {
  if (!usage) return null

  return (
    <article className={`usageLimit-card ${compact ? 'is-compact' : ''}`}>
      <div className="usageLimit-head">
        <div>
          <p>Current plan</p>
          <h3>{usage.loading ? 'Loading…' : usage.planLabel}</h3>
        </div>
        <a href="/limits">Usage limits</a>
      </div>

      <div className="usageLimit-list">
        <UsageRow label="ATS analyses" used={usage.analysis.used} limit={usage.analysis.limit} />
        <UsageRow label="Cover letters" used={usage.coverLetters.used} limit={usage.coverLetters.limit} />
        <UsageRow label="Stored CVs" used={usage.cvs.used} limit={usage.cvs.limit} />
      </div>

      <footer>
        <span>{usage.resetLabel}</span>
        <a href="/pricing">View pricing</a>
      </footer>
    </article>
  )
}
