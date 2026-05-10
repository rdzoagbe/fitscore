import React, { useState } from 'react'
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

function UsageDebug({ usage }) {
  if (!usage?.isAdmin) return null
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800 }}>Admin usage debug</summary>
      <div style={{ marginTop: 8, padding: 10, borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-soft)', display: 'grid', gap: 6, color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.45 }}>
        <span>Plan ID: {usage.planId}</span>
        <span>Analysis events: {usage.sources?.analysis?.usage_events ?? 0} · Legacy analyses: {usage.sources?.analysis?.legacy ?? 0}</span>
        <span>Cover letter events: {usage.sources?.coverLetters?.usage_events ?? 0} · Legacy API usage: {usage.sources?.coverLetters?.legacy ?? 0}</span>
        <span>Cached analyses do not consume extra usage. Failed AI requests are not counted as successful usage events.</span>
      </div>
    </details>
  )
}

export default function UsageLimitCard({ usage, compact = false }) {
  const [expanded, setExpanded] = useState(false)
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

      {expanded && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: 'var(--bg-input)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.55 }}>
          <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 4 }}>How usage is counted</strong>
          <span>Successful new ATS analyses and cover letters count against your plan. Cached repeat analyses do not consume extra usage. Failed AI requests are not counted as successful usage.</span>
        </div>
      )}

      <UsageDebug usage={usage} />

      <footer>
        <span>{usage.resetLabel}</span>
        <button type="button" onClick={() => setExpanded(v => !v)} style={{ border: 0, background: 'transparent', color: 'var(--accent)', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>{expanded ? 'Hide details' : 'How it works'}</button>
        <a href="/pricing">View pricing</a>
      </footer>
    </article>
  )
}
