import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './AdminReliabilityPage.css'

const periodOptions = [7, 30, 90]

function MetricCard({ label, value, hint, tone }) {
  return (
    <article className={`reliabilityMetric ${tone ? `is-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {hint && <small>{hint}</small>}
    </article>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="reliabilityEmpty">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function severityLabel(severity) {
  if (!severity) return 'info'
  return String(severity).toLowerCase()
}

export default function AdminReliabilityPage({ setPage }) {
  const [days, setDays] = useState(30)
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = async selectedDays => {
    setStatus('loading')
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Please sign in as an admin to view reliability metrics.')

      const res = await fetch(`/api/admin/reliability?days=${selectedDays}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error || `Reliability endpoint failed (${res.status})`)
      setData(payload)
      setStatus('done')
    } catch (err) {
      setError(err.message || 'Unable to load reliability dashboard.')
      setStatus('error')
    }
  }

  useEffect(() => { load(days) }, [days])

  const failureRate = useMemo(() => {
    const total = data?.summary?.total_events || 0
    const critical = data?.summary?.critical_events || 0
    if (!total) return '0%'
    return `${Math.round((critical / total) * 100)}%`
  }, [data])

  const recent = data?.recent || []
  const endpoints = data?.by_endpoint || []
  const messages = data?.top_messages || []
  const daysSeries = data?.by_day || []

  return (
    <main className="adminReliabilityPage">
      <section className="adminReliabilityHero">
        <div>
          <p className="eyebrow">Product reliability</p>
          <h1>Error and API health dashboard</h1>
          <p>
            Monitor frontend crashes, failed API calls, endpoint hot spots, and recent reliability events without exposing private CV, cover-letter, or LinkedIn content.
          </p>
        </div>
        <div className="reliabilityHeroActions">
          <div className="periodSwitch" role="group" aria-label="Reliability period">
            {periodOptions.map(option => (
              <button key={option} type="button" className={days === option ? 'is-active' : ''} onClick={() => setDays(option)}>
                {option}d
              </button>
            ))}
          </div>
          <button type="button" className="ghostBtn" onClick={() => load(days)}>Refresh</button>
          <button type="button" className="ghostBtn" onClick={() => setPage?.('dashboard')}>Dashboard</button>
        </div>
      </section>

      {status === 'loading' && <EmptyState title="Loading reliability metrics…" text="Collecting recent product health signals." />}
      {status === 'error' && <EmptyState title="Unable to load reliability dashboard" text={error} />}

      {status === 'done' && data && (
        <>
          <section className="reliabilityGrid">
            <MetricCard label="Total events" value={data.summary?.total_events || 0} hint={`Last ${days} days`} />
            <MetricCard label="Frontend errors" value={data.summary?.frontend_events || 0} hint="Browser/runtime issues" />
            <MetricCard label="API failures" value={data.summary?.api_events || 0} hint="Server or request errors" tone="warning" />
            <MetricCard label="Critical ratio" value={failureRate} hint={`${data.summary?.critical_events || 0} critical events`} tone="danger" />
          </section>

          <section className="reliabilityPanels">
            <article className="reliabilityPanel">
              <div className="panelHeader">
                <h2>Endpoint hot spots</h2>
                <span>{endpoints.length} endpoints</span>
              </div>
              {endpoints.length === 0 ? <EmptyState title="No endpoint failures" text="No API failure events were recorded for this period." /> : (
                <div className="endpointList">
                  {endpoints.map(item => (
                    <div key={item.endpoint} className="endpointRow">
                      <code>{item.endpoint}</code>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="reliabilityPanel">
              <div className="panelHeader">
                <h2>Top messages</h2>
                <span>Grouped by message</span>
              </div>
              {messages.length === 0 ? <EmptyState title="No repeated errors" text="No recurring error messages recorded yet." /> : (
                <div className="messageList">
                  {messages.map(item => (
                    <div key={item.message} className="messageRow">
                      <p>{item.message}</p>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="reliabilityPanel fullWidth">
            <div className="panelHeader">
              <h2>Daily trend</h2>
              <span>Events per day</span>
            </div>
            {daysSeries.length === 0 ? <EmptyState title="No trend data" text="No reliability events are available for this period." /> : (
              <div className="trendBars">
                {daysSeries.map(item => {
                  const max = Math.max(...daysSeries.map(d => d.count || 0), 1)
                  const height = Math.max(8, Math.round(((item.count || 0) / max) * 90))
                  return (
                    <div key={item.day} className="trendBar" title={`${item.day}: ${item.count}`}>
                      <span style={{ height }} />
                      <small>{String(item.day).slice(5)}</small>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="reliabilityPanel fullWidth">
            <div className="panelHeader">
              <h2>Recent events</h2>
              <span>{recent.length} latest</span>
            </div>
            {recent.length === 0 ? <EmptyState title="No reliability events" text="The product has not logged client or API reliability issues in this period." /> : (
              <div className="recentEvents">
                {recent.map(event => (
                  <article key={event.id} className="recentEvent">
                    <div className="eventTopline">
                      <span className={`severityPill is-${severityLabel(event.severity)}`}>{severityLabel(event.severity)}</span>
                      <strong>{event.source || 'unknown'}</strong>
                      <small>{formatDate(event.created_at)}</small>
                    </div>
                    <p>{event.message || 'No message'}</p>
                    <div className="eventMeta">
                      {event.endpoint && <code>{event.endpoint}</code>}
                      {event.status_code && <span>HTTP {event.status_code}</span>}
                      {event.page_path && <span>{event.page_path}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
