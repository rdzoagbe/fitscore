import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import ScoreHistoryChart from '../components/ScoreHistoryChart'
import StatusPill from '../components/StatusPill'
import DeleteAllModal from '../components/DeleteAllModal'
import './HistoryPage.css'
import './JobTrackerPhase4.css'

const TRACKER_META_VERSION = 'joblytics_tracker_meta_v1'

function scoreValue(analysis) {
  const score = Number(analysis?.score)
  return Number.isFinite(score) ? Math.round(score) : 0
}

function scoreColor(score) {
  if (score >= 70) return '#4caf7d'
  if (score >= 50) return '#f5a623'
  return '#ff6b6b'
}

function getTrackerStorageKey(userId) {
  return `${TRACKER_META_VERSION}_${userId || 'local'}`
}

function loadTrackerMeta(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(getTrackerStorageKey(userId)) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveTrackerMeta(userId, meta) {
  try { localStorage.setItem(getTrackerStorageKey(userId), JSON.stringify(meta || {})) } catch {}
}

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function getJobTitle(analysis, fallback) {
  return safeText(
    analysis.job_title || analysis.result?.job_context?.title,
    fallback
  )
}

function getJobCompany(analysis) {
  const company = analysis.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

function getJobInfo(analysis, t) {
  const ctx = analysis.result?.job_context || {}
  const fallbackTitle = (() => {
    try { return new URL(analysis.job_url).hostname.replace('www.', '') } catch { return t('history_job_analysis') }
  })()

  return {
    title: getJobTitle(analysis, fallbackTitle),
    company: getJobCompany(analysis),
    location: ctx.location && ctx.location !== 'Not specified' ? ctx.location : '',
    salary: ctx.salary_range && ctx.salary_range !== 'Not specified' ? ctx.salary_range : '',
    workMode: ctx.work_mode && ctx.work_mode !== 'unknown' ? ctx.work_mode : '',
    contract: ctx.contract_type && ctx.contract_type !== 'unknown' ? ctx.contract_type : '',
    sourceUrl: analysis.job_url && analysis.job_url !== 'manual_paste' ? analysis.job_url : '',
    nextBestAction: analysis.result?.next_best_action?.label || analysis.result?.next_best_action?.action || '',
    recruiterRisk: analysis.result?.recruiter_shortlist?.likely_recruiter_concerns?.[0] || analysis.result?.critical_gaps?.[0] || ''
  }
}

function getPipelineStatus(analysis) {
  return analysis.application_status || 'saved'
}

function getStatusLabel(status) {
  return ({
    saved: 'Saved',
    applied: 'Applied',
    interview: 'Interview',
    offer: 'Offer',
    rejected: 'Rejected',
    withdrawn: 'Archived'
  })[status || 'saved'] || 'Saved'
}

function isDueSoon(dateValue) {
  if (!dateValue) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateValue)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return diff <= 2 * 24 * 60 * 60 * 1000
}

function StatCard({ label, value, helper }) {
  return (
    <article className="historyWide-stat">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{helper}</span>
    </article>
  )
}

function ProgressLine({ label, value, color }) {
  return (
    <div className="historyWide-progressLine">
      <div>
        <span>{label}</span>
        <strong style={{ color }}>{value}%</strong>
      </div>
      <em>
        <i style={{ width: `${value}%`, background: color }} />
      </em>
    </div>
  )
}

function PipelineCard({ title, count, helper, tone, items, onSelectAnalysis }) {
  return (
    <article className={`jobTracker-column jobTracker-column--${tone}`}>
      <div className="jobTracker-columnHead">
        <div>
          <strong>{title}</strong>
          <span>{helper}</span>
        </div>
        <em>{count}</em>
      </div>

      <div className="jobTracker-miniList">
        {items.slice(0, 4).map(item => (
          <button key={item.id} type="button" onClick={() => onSelectAnalysis(item)}>
            <strong>{item.display.title}</strong>
            <span>{item.display.company || item.display.location || `${scoreValue(item)}% match`}</span>
          </button>
        ))}
        {items.length === 0 && <p>No jobs yet in this stage.</p>}
      </div>
    </article>
  )
}

function TrackerMetaEditor({ analysis, meta, onChange }) {
  const current = meta[analysis.id] || {}
  const update = patch => onChange(analysis.id, { ...current, ...patch, updatedAt: new Date().toISOString() })

  return (
    <div className="jobTracker-metaEditor" onClick={event => event.stopPropagation()}>
      <label>
        <span>Next action</span>
        <input
          value={current.nextAction || ''}
          onChange={event => update({ nextAction: event.target.value })}
          placeholder="Follow up, prepare interview, send CV..."
        />
      </label>
      <label>
        <span>Reminder</span>
        <input
          type="date"
          value={current.dueDate || ''}
          onChange={event => update({ dueDate: event.target.value })}
        />
      </label>
      <label className="jobTracker-noteField">
        <span>Notes</span>
        <textarea
          value={current.note || ''}
          onChange={event => update({ note: event.target.value })}
          placeholder="Recruiter name, salary range, follow-up context..."
          rows={2}
        />
      </label>
    </div>
  )
}

export default function Dashboard({ onNewAnalysis, onSelectAnalysis }) {
  const { user } = useAuth()
  const { t, lang } = useLang()

  const [analyses, setAnalyses] = useState([])
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [search, setSearch] = useState('')
  const [trackerMeta, setTrackerMeta] = useState({})

  useEffect(() => {
    fetchAnalyses()
    setTrackerMeta(loadTrackerMeta(user?.id))
  }, [])

  const updateTrackerMeta = (analysisId, nextValue) => {
    setTrackerMeta(current => {
      const next = { ...current, [analysisId]: nextValue }
      saveTrackerMeta(user?.id, next)
      return next
    })
  }

  const fetchAnalyses = async () => {
    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    setAnalyses(data || [])
    setLoading(false)
  }

  const deleteAnalysis = async (id, event) => {
    event.stopPropagation()
    setDeleting(id)
    await supabase.from('analyses').delete().eq('id', id)
    setAnalyses(prev => prev.filter(item => item.id !== id))
    setTrackerMeta(current => {
      const next = { ...current }
      delete next[id]
      saveTrackerMeta(user?.id, next)
      return next
    })
    setDeleting(null)
  }

  const handleDeleteAll = async () => {
    if (!user) throw new Error('Not signed in')

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error

    setAnalyses([])
    setTrackerMeta({})
    saveTrackerMeta(user?.id, {})
    setDeleteAllOpen(false)
    setDeleting(null)
  }

  const localeMap = {
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-PT'
  }

  const formatDate = value =>
    new Date(value).toLocaleDateString(localeMap[lang] || 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })

  const verdictLabel = value => ({
    likely_passed: t('likely_passed', t('history_likely_passed')),
    borderline: t('borderline', 'Borderline'),
    likely_filtered: t('likely_filtered', 'Likely filtered')
  })[value] || t('verdict_unknown')

  const enrichedAnalyses = useMemo(() => analyses.map(item => ({
    ...item,
    display: getJobInfo(item, t),
    tracker: trackerMeta[item.id] || {}
  })), [analyses, trackerMeta, t])

  const stats = useMemo(() => {
    const scores = analyses.map(scoreValue)
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0

    const bestScore = scores.length ? Math.max(...scores) : 0
    const passedCount = analyses.filter(item => item.result?.overall_verdict === 'likely_passed').length
    const borderlineCount = analyses.filter(item => item.result?.overall_verdict === 'borderline').length
    const filteredCount = analyses.filter(item => item.result?.overall_verdict === 'likely_filtered').length

    return {
      avgScore,
      bestScore,
      passedCount,
      borderlineCount,
      filteredCount
    }
  }, [analyses])

  const pipeline = useMemo(() => {
    const buckets = {
      saved: [],
      applied: [],
      interview: [],
      offer: [],
      rejected: [],
      withdrawn: []
    }
    enrichedAnalyses.forEach(item => {
      const key = getPipelineStatus(item)
      if (buckets[key]) buckets[key].push(item)
      else buckets.saved.push(item)
    })
    return buckets
  }, [enrichedAnalyses])

  const trackerStats = useMemo(() => {
    const active = pipeline.saved.length + pipeline.applied.length + pipeline.interview.length + pipeline.offer.length
    const dueSoon = enrichedAnalyses.filter(item => isDueSoon(item.tracker?.dueDate)).length
    const withNotes = enrichedAnalyses.filter(item => item.tracker?.note || item.tracker?.nextAction).length
    return { active, dueSoon, withNotes }
  }, [pipeline, enrichedAnalyses])

  const total = analyses.length || 1
  const passedPercent = Math.round((stats.passedCount / total) * 100)
  const borderlinePercent = Math.round((stats.borderlineCount / total) * 100)
  const filteredPercent = Math.round((stats.filteredCount / total) * 100)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return enrichedAnalyses
      .filter(item => {
        const matchFilter = filter === 'all' || item.result?.overall_verdict === filter
        const title = item.display.title || ''
        const company = item.display.company || ''
        const url = item.job_url || ''
        const status = getStatusLabel(getPipelineStatus(item))
        const trackerText = `${item.tracker?.nextAction || ''} ${item.tracker?.note || ''}`

        const matchSearch =
          !query ||
          title.toLowerCase().includes(query) ||
          company.toLowerCase().includes(query) ||
          url.toLowerCase().includes(query) ||
          status.toLowerCase().includes(query) ||
          trackerText.toLowerCase().includes(query)

        return matchFilter && matchSearch
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return scoreValue(b) - scoreValue(a)
        if (sortBy === 'followup') return Number(isDueSoon(b.tracker?.dueDate)) - Number(isDueSoon(a.tracker?.dueDate))
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [enrichedAnalyses, filter, search, sortBy])

  const filters = [
    { value: 'all', label: t('history_filter_all') },
    { value: 'likely_passed', label: t('history_filter_passed') },
    { value: 'borderline', label: t('history_filter_borderline') },
    { value: 'likely_filtered', label: t('history_filter_filtered') }
  ]

  const pipelineColumns = [
    { key: 'saved', title: 'Saved', helper: 'Jobs to review', tone: 'saved' },
    { key: 'applied', title: 'Applied', helper: 'Applications sent', tone: 'applied' },
    { key: 'interview', title: 'Interview', helper: 'Prepare and follow up', tone: 'interview' },
    { key: 'offer', title: 'Offer', helper: 'Negotiate / decide', tone: 'offer' },
    { key: 'rejected', title: 'Rejected', helper: 'Archive and learn', tone: 'rejected' },
    { key: 'withdrawn', title: 'Archived', helper: 'Closed or skipped', tone: 'archived' }
  ]

  return (
    <div className="historyWide-page page-enter">
      <div className="historyWide-glow historyWide-glowOne" />
      <div className="historyWide-glow historyWide-glowTwo" />

      <main className="historyWide-shell">
        <section className="historyWide-hero">
          <div>
            <p className="historyWide-kicker">Job tracker / career CRM</p>
            <h1>{t('history_title')}</h1>
            <p>{t('history_intro')}</p>

            <div className="historyWide-actions">
              <button type="button" className="historyWide-primaryBtn" onClick={onNewAnalysis}>
                {t('history_new_check')}
              </button>

              {analyses.length > 0 && (
                <button type="button" className="historyWide-dangerBtn" onClick={() => setDeleteAllOpen(true)}>
                  {t('history_delete_all')}
                </button>
              )}
            </div>
          </div>

          <aside className="historyWide-heroPanel">
            <div className="historyWide-orb">
              <strong>{stats.avgScore}</strong>
              <span>{t('history_avg_score_short')}</span>
            </div>
            <div>
              <p>Pipeline health</p>
              <h2>{trackerStats.active} active jobs</h2>
              <span>{trackerStats.dueSoon} follow-ups due soon · {trackerStats.withNotes} with CRM notes</span>
            </div>
          </aside>
        </section>

        {!loading && analyses.length > 0 && (
          <section className="historyWide-stats">
            <StatCard label={t('history_average_score')} value={`${stats.avgScore}%`} helper={t('history_across_checks')} />
            <StatCard label={t('history_best_score')} value={`${stats.bestScore}%`} helper={t('history_highest_match')} />
            <StatCard label="Active pipeline" value={trackerStats.active} helper="Saved, applied, interviews and offers" />
            <StatCard label="Follow-up due" value={trackerStats.dueSoon} helper="Reminder date within 48 hours" />
          </section>
        )}

        {!loading && analyses.length > 0 && (
          <section className="historyWide-card jobTracker-board">
            <div className="historyWide-sectionHead jobTracker-boardHead">
              <div>
                <p className="historyWide-kicker">Phase 4 · Career CRM</p>
                <h2>Application pipeline</h2>
                <p>Move jobs with the status pill, then use notes, next actions and reminder dates to manage every application like a CRM.</p>
              </div>
              <button type="button" className="historyWide-primaryBtn" onClick={() => setSortBy('followup')}>Show follow-ups first</button>
            </div>

            <div className="jobTracker-pipelineGrid">
              {pipelineColumns.map(column => (
                <PipelineCard
                  key={column.key}
                  title={column.title}
                  helper={column.helper}
                  tone={column.tone}
                  count={pipeline[column.key]?.length || 0}
                  items={pipeline[column.key] || []}
                  onSelectAnalysis={onSelectAnalysis}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && analyses.length >= 2 && (
          <section className="historyWide-insights">
            <article className="historyWide-card historyWide-chartCard">
              <p className="historyWide-kicker">{t('history_score_trend')}</p>
              <h2>{t('history_progress_time')}</h2>
              <div className="historyWide-chartBox">
                <ScoreHistoryChart analyses={analyses} t={t} />
              </div>
            </article>

            <article className="historyWide-card">
              <p className="historyWide-kicker">{t('history_verdict_breakdown')}</p>
              <h2>{t('history_match_quality')}</h2>

              <div className="historyWide-progressStack">
                <ProgressLine label={t('likely_passed', t('history_likely_passed'))} value={passedPercent} color="#4caf7d" />
                <ProgressLine label={t('borderline', 'Borderline')} value={borderlinePercent} color="#f5a623" />
                <ProgressLine label={t('likely_filtered', 'Likely filtered')} value={filteredPercent} color="#ff6b6b" />
              </div>
            </article>
          </section>
        )}

        <section className="historyWide-card historyWide-resultsCard">
          <div className="historyWide-sectionHead">
            <div>
              <p className="historyWide-kicker">Tracked applications</p>
              <h2>{t('history_saved_title')}</h2>
              <p>{t('history_saved_intro')}</p>
            </div>
          </div>

          {!loading && analyses.length > 0 && (
            <div className="historyWide-toolbar">
              <label className="historyWide-search">
                <span>⌕</span>
                <input
                  type="text"
                  placeholder={t('history_search_placeholder')}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </label>

              <div className="historyWide-filterGroup">
                {filters.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    className={filter === item.value ? 'is-active' : ''}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="historyWide-sortBtn"
                onClick={() => setSortBy(value => value === 'recent' ? 'priority' : value === 'priority' ? 'followup' : 'recent')}
              >
                {sortBy === 'priority'
                  ? `⭐ ${t('history_sort_priority')}`
                  : sortBy === 'followup'
                    ? '🔔 Follow-ups first'
                    : `🕐 ${t('history_sort_recent')}`}
              </button>
            </div>
          )}

          {loading && (
            <div className="historyWide-grid">
              {[1, 2, 3, 4, 5, 6].map(item => (
                <div key={item} className="historyWide-skeleton" />
              ))}
            </div>
          )}

          {!loading && analyses.length === 0 && (
            <div className="historyWide-empty">
              <div>📋</div>
              <h3>{t('history_no_analyses')}</h3>
              <p>{t('history_no_analyses_desc')}</p>
              <button type="button" className="historyWide-primaryBtn" onClick={onNewAnalysis}>
                {t('history_start_analyzing')}
              </button>
            </div>
          )}

          {!loading && analyses.length > 0 && filtered.length === 0 && (
            <div className="historyWide-empty">
              <h3>{t('history_no_filter_match')}</h3>
              <p>{t('history_try_filter')}</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="historyWide-grid jobTracker-cardGrid">
              {filtered.map(analysis => {
                const score = scoreValue(analysis)
                const color = scoreColor(score)
                const company = analysis.display.company
                const location = analysis.display.location
                const meta = trackerMeta[analysis.id] || {}

                return (
                  <article key={analysis.id} className="historyWide-item jobTracker-jobCard" onClick={() => onSelectAnalysis(analysis)}>
                    <div className="historyWide-itemTop">
                      <div className="historyWide-score" style={{ color, borderColor: color }}>
                        {score}%
                      </div>

                      <button
                        type="button"
                        className="historyWide-delete"
                        onClick={event => deleteAnalysis(analysis.id, event)}
                        disabled={deleting === analysis.id}
                        aria-label={t('history_delete_analysis')}
                      >
                        ×
                      </button>
                    </div>

                    <h3>{analysis.display.title}</h3>
                    {company && <p className="historyWide-company">@ {company}</p>}

                    <div className="historyWide-meta">
                      <span style={{ color, borderColor: `${color}55`, background: `${color}18` }}>
                        {verdictLabel(analysis.result?.overall_verdict)}
                      </span>
                      <em>{formatDate(analysis.created_at)}</em>
                      {location && <em>📍 {location.split(',')[0]}</em>}
                    </div>

                    <div className="jobTracker-detailGrid">
                      <span><b>Status</b>{getStatusLabel(getPipelineStatus(analysis))}</span>
                      <span><b>Work mode</b>{analysis.display.workMode || 'Not set'}</span>
                      <span><b>Contract</b>{analysis.display.contract || 'Not set'}</span>
                      <span><b>Salary</b>{analysis.display.salary || 'Not stated'}</span>
                    </div>

                    {(analysis.display.nextBestAction || analysis.display.recruiterRisk || meta.nextAction || meta.dueDate) && (
                      <div className={`jobTracker-nextAction${isDueSoon(meta.dueDate) ? ' is-due' : ''}`}>
                        <strong>{meta.nextAction || analysis.display.nextBestAction || 'Recommended next action'}</strong>
                        <p>{meta.dueDate ? `Reminder: ${formatDate(meta.dueDate)}` : analysis.display.recruiterRisk || 'Open the analysis to review details.'}</p>
                      </div>
                    )}

                    <div className="historyWide-status">
                      <StatusPill
                        analysis={analysis}
                        onUpdate={updated => setAnalyses(prev => prev.map(item => item.id === updated.id ? updated : item))}
                        compact
                      />
                    </div>

                    <TrackerMetaEditor analysis={analysis} meta={trackerMeta} onChange={updateTrackerMeta} />
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {deleteAllOpen && (
        <DeleteAllModal
          count={analyses.length}
          onConfirm={handleDeleteAll}
          onClose={() => setDeleteAllOpen(false)}
        />
      )}
    </div>
  )
}
