import React, { useMemo } from 'react'
import StatusPill from './StatusPill'
import './ApplicationPipelineBoard.css'

const PIPELINE_COLUMNS = [
  { key: 'not_applied', status: null, title: 'Not applied', icon: '○', hint: 'Good matches to decide on' },
  { key: 'applied', status: 'applied', title: 'Applied', icon: '📨', hint: 'Applications sent' },
  { key: 'interview', status: 'interview', title: 'Interview', icon: '💬', hint: 'Calls and interviews' },
  { key: 'technical_test', status: 'technical_test', title: 'Technical test', icon: '🧪', hint: 'Tests and cases' },
  { key: 'follow_up', status: 'follow_up', title: 'Follow-up', icon: '⏰', hint: 'Needs action' },
  { key: 'offer', status: 'offer', title: 'Offer', icon: '🎉', hint: 'Negotiation stage' },
  { key: 'rejected', status: 'rejected', title: 'Rejected', icon: '✗', hint: 'Closed or archived' }
]

function getScore(analysis) {
  const score = Number(analysis?.score)
  return Number.isFinite(score) ? Math.round(score) : 0
}

function getTitle(analysis) {
  if (analysis?.job_title) return analysis.job_title
  if (analysis?.result?.job_context?.title) return analysis.result.job_context.title
  try { return new URL(analysis?.job_url).hostname.replace('www.', '') } catch { return 'Job analysis' }
}

function getCompany(analysis) {
  const company = analysis?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

function getTracker(analysis) {
  return analysis?.result?.application_tracker || {}
}

function formatShortDate(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
  } catch {
    return value
  }
}

function normalizeStatus(status) {
  if (!status) return 'not_applied'
  if (status === 'withdrawn') return 'rejected'
  return status
}

function PipelineCard({ analysis, onSelectAnalysis, onOpenTracker, onStatusUpdated }) {
  const score = getScore(analysis)
  const tracker = getTracker(analysis)
  const company = getCompany(analysis)
  const followUp = tracker.follow_up_date || tracker.followUpDate
  const nextAction = tracker.next_action || tracker.nextAction
  const recruiter = tracker.recruiter_name || tracker.recruiterName

  return (
    <article className="pipeline-card" onClick={() => onSelectAnalysis?.(analysis)}>
      <div className="pipeline-cardTop">
        <strong>{score}%</strong>
        <StatusPill analysis={analysis} onUpdate={onStatusUpdated} compact />
      </div>
      <h4>{getTitle(analysis)}</h4>
      {company && <p className="pipeline-company">@ {company}</p>}
      <div className="pipeline-meta">
        {followUp && <span>⏰ {formatShortDate(followUp)}</span>}
        {recruiter && <span>👤 {recruiter}</span>}
        {!followUp && !recruiter && <span>Created {formatShortDate(analysis.created_at)}</span>}
      </div>
      {nextAction && <p className="pipeline-next">Next: {nextAction}</p>}
      <button type="button" className="pipeline-trackBtn" onClick={event => onOpenTracker?.(analysis, event)}>
        Update tracker
      </button>
    </article>
  )
}

export default function ApplicationPipelineBoard({ analyses = [], onSelectAnalysis, onOpenTracker, onStatusUpdated }) {
  const board = useMemo(() => {
    const grouped = PIPELINE_COLUMNS.reduce((acc, column) => ({ ...acc, [column.key]: [] }), {})

    analyses.forEach(analysis => {
      const key = normalizeStatus(analysis?.application_status)
      if (grouped[key]) grouped[key].push(analysis)
      else grouped.not_applied.push(analysis)
    })

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const aFollow = getTracker(a).follow_up_date || '9999-12-31'
        const bFollow = getTracker(b).follow_up_date || '9999-12-31'
        if (aFollow !== bFollow) return String(aFollow).localeCompare(String(bFollow))
        return getScore(b) - getScore(a)
      })
    })

    return grouped
  }, [analyses])

  const activeCount = analyses.filter(item => !['rejected', 'withdrawn'].includes(item.application_status || '')).length
  const followUpCount = analyses.filter(item => item.application_status === 'follow_up' || getTracker(item).follow_up_date).length
  const interviewCount = analyses.filter(item => ['interview', 'technical_test'].includes(item.application_status || '')).length

  if (!analyses.length) return null

  return (
    <section className="pipeline-boardWrap">
      <div className="pipeline-head">
        <div>
          <p className="pipeline-kicker">Application pipeline</p>
          <h2>Turn analyses into a real job-search board</h2>
          <p>Move every opportunity from “not applied” to interviews, follow-ups, offers, and closed outcomes.</p>
        </div>
        <div className="pipeline-summary">
          <span><strong>{activeCount}</strong> active</span>
          <span><strong>{interviewCount}</strong> in interview/test</span>
          <span><strong>{followUpCount}</strong> follow-up tracked</span>
        </div>
      </div>

      <div className="pipeline-scroll">
        {PIPELINE_COLUMNS.map(column => {
          const items = board[column.key] || []
          return (
            <div key={column.key} className="pipeline-column">
              <div className="pipeline-columnHead">
                <div>
                  <span>{column.icon}</span>
                  <strong>{column.title}</strong>
                </div>
                <em>{items.length}</em>
              </div>
              <p className="pipeline-hint">{column.hint}</p>

              <div className="pipeline-list">
                {items.length === 0 ? (
                  <div className="pipeline-empty">No cards yet</div>
                ) : items.slice(0, 8).map(analysis => (
                  <PipelineCard
                    key={analysis.id}
                    analysis={analysis}
                    onSelectAnalysis={onSelectAnalysis}
                    onOpenTracker={onOpenTracker}
                    onStatusUpdated={onStatusUpdated}
                  />
                ))}
                {items.length > 8 && <div className="pipeline-more">+{items.length - 8} more in list below</div>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
