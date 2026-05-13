import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './AdminAnalyticsPage.css'

const EMPTY_OVERVIEW = {
  period_days: 30,
  totals: {},
  period: {},
  funnel: {},
  usage_by_action: [],
  plan_distribution: [],
  generated_at: null
}

function fmtNumber(value) {
  const n = Number(value || 0)
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function fmtDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch {
    return '—'
  }
}

function pct(part, total) {
  const p = Number(part || 0)
  const t = Number(total || 0)
  if (!t) return 0
  return Math.round((p / t) * 100)
}

function StatCard({ label, value, hint, tone }) {
  return (
    <article className={`adminStat ${tone ? `adminStat--${tone}` : ''}`}>
      <p>{label}</p>
      <strong>{fmtNumber(value)}</strong>
      {hint && <span>{hint}</span>}
    </article>
  )
}

function ProgressRow({ label, value, max, meta }) {
  const percentage = Math.min(100, pct(value, max || value || 1))
  return (
    <div className="adminProgressRow">
      <div>
        <strong>{label}</strong>
        {meta && <span>{meta}</span>}
      </div>
      <em>{fmtNumber(value)}</em>
      <div className="adminProgressTrack" aria-hidden="true">
        <i style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage({ setPage }) {
  const { user } = useAuth()
  const [days, setDays] = useState(30)
  const [overview, setOverview] = useState(EMPTY_OVERVIEW)
  const [activity, setActivity] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const loadAnalytics = async () => {
    if (!user) return
    setStatus('loading')
    setError(null)

    const [overviewRes, activityRes] = await Promise.all([
      supabase.rpc('admin_analytics_overview', { p_days: days }),
      supabase.rpc('admin_analytics_activity', { p_limit: 24 })
    ])

    if (overviewRes.error) {
      setStatus('restricted')
      setError(overviewRes.error.message || 'Admin analytics are not available for this account.')
      return
    }

    setOverview(overviewRes.data || EMPTY_OVERVIEW)
    setActivity(Array.isArray(activityRes.data) ? activityRes.data : [])
    setStatus('ready')
  }

  useEffect(() => {
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, days])

  const totals = overview?.totals || {}
  const period = overview?.period || {}
  const funnel = overview?.funnel || {}
  const usageByAction = Array.isArray(overview?.usage_by_action) ? overview.usage_by_action : []
  const planDistribution = Array.isArray(overview?.plan_distribution) ? overview.plan_distribution : []
  const maxAction = useMemo(() => Math.max(1, ...usageByAction.map(a => Number(a.total || 0))), [usageByAction])
  const maxPlan = useMemo(() => Math.max(1, ...planDistribution.map(p => Number(p.total || 0))), [planDistribution])

  if (status === 'loading') {
    return (
      <main className="adminAnalyticsPage">
        <section className="adminAnalyticsHero is-loading">
          <p>Admin workspace</p>
          <h1>Loading product analytics…</h1>
          <span className="adminSpinner" />
        </section>
      </main>
    )
  }

  if (status === 'restricted') {
    return (
      <main className="adminAnalyticsPage">
        <section className="adminRestrictedCard">
          <span>🔒</span>
          <p>Admin workspace</p>
          <h1>Restricted access</h1>
          <p className="adminMuted">This dashboard is available only to approved admin accounts. Add your email to <code>public.admin_users</code> in Supabase if you should have access.</p>
          {error && <pre>{error}</pre>}
          <button type="button" onClick={() => setPage?.('dashboard')}>Back to dashboard</button>
        </section>
      </main>
    )
  }

  return (
    <main className="adminAnalyticsPage">
      <section className="adminAnalyticsHero">
        <div>
          <p>Admin workspace</p>
          <h1>Product analytics</h1>
          <span>Track signups, analyses, feature adoption, and job-search workflow usage without exposing private user content.</span>
        </div>
        <div className="adminHeroActions">
          <select value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Analytics period">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button type="button" onClick={loadAnalytics}>Refresh</button>
        </div>
      </section>

      <section className="adminStatsGrid" aria-label="Product totals">
        <StatCard label="Users" value={totals.users} hint="Profiles in Supabase" tone="blue" />
        <StatCard label="ATS analyses" value={totals.analyses} hint={`${fmtNumber(period.analyses)} in period`} />
        <StatCard label="Cover letters" value={totals.cover_letters} hint={`${fmtNumber(period.cover_letters)} in period`} />
        <StatCard label="LinkedIn saves" value={totals.linkedin_optimizations} hint={`${fmtNumber(period.linkedin_optimizations)} in period`} />
        <StatCard label="CV versions" value={totals.cv_versions} hint="Saved in vault" />
        <StatCard label="Applications" value={totals.applications} hint="Pipeline records" />
      </section>

      <section className="adminAnalyticsGrid">
        <article className="adminPanel">
          <div className="adminPanelHeader">
            <div>
              <p>Workflow funnel</p>
              <h2>Feature completion</h2>
            </div>
            <span>{days}d</span>
          </div>
          <ProgressRow label="Ran an ATS analysis" value={funnel.analysis_users} max={totals.users} meta={`${pct(funnel.analysis_users, totals.users)}% of users`} />
          <ProgressRow label="Saved a cover letter" value={funnel.cover_letter_users} max={totals.users} meta={`${pct(funnel.cover_letter_users, totals.users)}% of users`} />
          <ProgressRow label="Saved LinkedIn optimization" value={funnel.linkedin_users} max={totals.users} meta={`${pct(funnel.linkedin_users, totals.users)}% of users`} />
          <ProgressRow label="Created CV version" value={funnel.cv_version_users} max={totals.users} meta={`${pct(funnel.cv_version_users, totals.users)}% of users`} />
        </article>

        <article className="adminPanel">
          <div className="adminPanelHeader">
            <div>
              <p>Usage events</p>
              <h2>Actions by volume</h2>
            </div>
            <span>{fmtNumber(usageByAction.reduce((sum, a) => sum + Number(a.total || 0), 0))}</span>
          </div>
          {usageByAction.length ? usageByAction.map(action => (
            <ProgressRow
              key={action.action || 'unknown'}
              label={action.action || 'unknown'}
              value={action.total}
              max={maxAction}
              meta={`${fmtNumber(action.success)} successful`}
            />
          )) : <p className="adminEmpty">No usage events recorded yet.</p>}
        </article>

        <article className="adminPanel">
          <div className="adminPanelHeader">
            <div>
              <p>Plans</p>
              <h2>Plan distribution</h2>
            </div>
            <span>{fmtNumber(planDistribution.reduce((sum, p) => sum + Number(p.total || 0), 0))}</span>
          </div>
          {planDistribution.length ? planDistribution.map(plan => (
            <ProgressRow
              key={plan.plan || 'unknown'}
              label={plan.plan || 'unknown'}
              value={plan.total}
              max={maxPlan}
              meta={`${pct(plan.total, totals.users)}% of users`}
            />
          )) : <p className="adminEmpty">No plan data available yet.</p>}
        </article>

        <article className="adminPanel adminActivityPanel">
          <div className="adminPanelHeader">
            <div>
              <p>Recent activity</p>
              <h2>Latest product events</h2>
            </div>
            <span>{activity.length}</span>
          </div>
          {activity.length ? (
            <div className="adminActivityList">
              {activity.map((item, idx) => (
                <div className="adminActivityItem" key={`${item.type}-${item.created_at}-${idx}`}>
                  <span>{item.icon || '•'}</span>
                  <div>
                    <strong>{item.label || item.type}</strong>
                    <p>{item.meta || 'No metadata'}</p>
                  </div>
                  <em>{fmtDate(item.created_at)}</em>
                </div>
              ))}
            </div>
          ) : <p className="adminEmpty">No recent activity yet.</p>}
        </article>
      </section>

      <section className="adminSafetyNote">
        <strong>Privacy note</strong>
        <p>This dashboard shows aggregate counts and metadata only. It should not display CV text, cover-letter content, LinkedIn profile content, or private job-search notes.</p>
      </section>
    </main>
  )
}
