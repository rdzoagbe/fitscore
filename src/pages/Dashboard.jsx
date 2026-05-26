import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import StatusPill from '../components/StatusPill'
import DeleteAllModal from '../components/DeleteAllModal'
import { sanitizeAnalysisForDisplay } from '../utils/analysisSanitizer'
import './HistoryPage.css'
import './JobTrackerPhase4.css'
import './history-master-detail.css'

const PAGE_SIZE = 8

function scoreValue(analysis) {
  const score = Number(analysis?.score ?? analysis?.result?.display_score ?? analysis?.result?.match_probability)
  return Number.isFinite(score) ? Math.round(score) : 0
}

function scoreTone(score) {
  if (score >= 75) return 'strong'
  if (score >= 55) return 'medium'
  return 'weak'
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

function getPipelineStatus(analysis) {
  return analysis?.application_status || 'saved'
}

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function getJobTitle(analysis, t) {
  const result = analysis?.result || {}
  const fallbackTitle = (() => {
    try { return new URL(analysis.job_url).hostname.replace('www.', '') } catch { return t('history_job_analysis', 'Job analysis') }
  })()
  return safeText(analysis?.job_title || result?.job_context?.title, fallbackTitle)
}

function getJobCompany(analysis) {
  const company = analysis?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

function getJobDisplay(analysis, t) {
  const result = analysis?.result || {}
  const ctx = result.job_context || {}
  return {
    title: getJobTitle(analysis, t),
    company: getJobCompany(analysis),
    location: ctx.location && ctx.location !== 'Not specified' ? ctx.location : '',
    salary: ctx.salary_range && ctx.salary_range !== 'Not specified' ? ctx.salary_range : '',
    workMode: ctx.work_mode && ctx.work_mode !== 'unknown' ? ctx.work_mode : '',
    contract: ctx.contract_type && ctx.contract_type !== 'unknown' ? ctx.contract_type : '',
    sourceUrl: analysis?.job_url && analysis.job_url !== 'manual_paste' ? analysis.job_url : '',
    summary: result.job_summary || result.match_reasoning || '',
    verdict: result.recruiter_shortlist?.verdict || result.overall_verdict || '',
    recruiterReason: result.recruiter_shortlist?.reason || result.overall_reason || result.match_reasoning || '',
    nextAction: result.next_best_action?.label || result.next_best_action?.action || '',
    nextReason: result.next_best_action?.reason || '',
    createdAt: analysis?.created_at
  }
}

function listOf(value, limit = 6) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, limit) : []
}

function verdictLabel(value, t) {
  return ({
    likely_passed: t('likely_passed', 'Likely passed'),
    borderline: t('borderline', 'Borderline'),
    likely_filtered: t('likely_filtered', 'Likely filtered'),
    strong_shortlist: 'Strong shortlist',
    possible_shortlist: 'Possible shortlist',
    unlikely_shortlist: 'Unlikely shortlist'
  })[value] || t('verdict_unknown', 'Unknown')
}

function formatDate(value, lang = 'en') {
  if (!value) return '—'
  const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT' }
  return new Date(value).toLocaleDateString(localeMap[lang] || 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(value, lang = 'en') {
  if (!value) return ''
  const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT' }
  return new Date(value).toLocaleTimeString(localeMap[lang] || 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, helper, icon }) {
  return (
    <article className="historyMD-stat">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <em>{helper}</em>
      </div>
    </article>
  )
}

function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="historyMD-empty">
      <span>H</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  )
}

function DetailList({ title, items, empty, tone = 'neutral' }) {
  return (
    <div className={`historyMD-detailList historyMD-detailList--${tone}`}>
      <strong>{title}</strong>
      {items.length ? (
        <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
      ) : <p>{empty}</p>}
    </div>
  )
}

export default function Dashboard({ onNewAnalysis, onSelectAnalysis, onBuildCv, onGenerateMessage }) {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => { fetchAnalyses() }, [])

  const fetchAnalyses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(120)

    setAnalyses(data || [])
    setSelectedId(data?.[0]?.id || null)
    setLoading(false)
  }

  const deleteAnalysis = async (id, event) => {
    event?.stopPropagation?.()
    setDeleting(id)
    await supabase.from('analyses').delete().eq('id', id)
    setAnalyses(prev => prev.filter(item => item.id !== id))
    setSelectedId(current => current === id ? null : current)
    setDeleting(null)
  }

  const handleDeleteAll = async () => {
    if (!user) throw new Error('Not signed in')
    const { error } = await supabase.from('analyses').delete().eq('user_id', user.id)
    if (error) throw error
    setAnalyses([])
    setSelectedId(null)
    setDeleteAllOpen(false)
  }

  const enriched = useMemo(() => analyses.map(item => {
    const result = sanitizeAnalysisForDisplay(item.result || {})
    return {
      ...item,
      result,
      score: scoreValue({ ...item, result }),
      display: getJobDisplay({ ...item, result }, t)
    }
  }), [analyses, t])

  const stats = useMemo(() => {
    const scores = enriched.map(item => item.score).filter(score => Number.isFinite(score))
    const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
    const strong = enriched.filter(item => item.score >= 75).length
    const needsWork = enriched.filter(item => item.score < 55).length
    const latest = enriched[0]
    return { total: enriched.length, avg, strong, needsWork, latest }
  }, [enriched])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return enriched
      .filter(item => {
        const verdict = item.result?.overall_verdict || item.result?.recruiter_shortlist?.verdict || ''
        const tone = scoreTone(item.score)
        const matchFilter = filter === 'all' || filter === verdict || filter === tone || filter === getPipelineStatus(item)
        const haystack = `${item.display.title} ${item.display.company} ${item.display.location} ${item.display.contract} ${item.display.workMode} ${item.job_url || ''} ${getStatusLabel(getPipelineStatus(item))}`.toLowerCase()
        return matchFilter && (!query || haystack.includes(query))
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score
        if (sortBy === 'company') return (a.display.company || a.display.title).localeCompare(b.display.company || b.display.title)
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [enriched, search, filter, sortBy])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visibleRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, filter, sortBy])
  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id)
    if (selectedId && filtered.length && !filtered.some(item => item.id === selectedId)) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  const selected = filtered.find(item => item.id === selectedId) || filtered[0] || null
  const selectedScore = selected?.score || 0
  const selectedTone = scoreTone(selectedScore)
  const selectedResult = selected?.result || {}
  const selectedDisplay = selected?.display || {}
  const foundKeywords = listOf(selectedResult.keyword_match?.found, 8)
  const missingKeywords = listOf(selectedResult.keyword_match?.missing_required, 8)
  const quickWins = listOf(selectedResult.quick_wins, 5)
  const gaps = listOf(selectedResult.critical_gaps?.length ? selectedResult.critical_gaps : selectedResult.proof_gaps, 5)
  const met = listOf(selectedResult.requirements_check?.met, 5)
  const unmet = listOf(selectedResult.requirements_check?.unmet, 5)

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'strong', label: 'Strong' },
    { value: 'medium', label: 'Medium' },
    { value: 'weak', label: 'Needs work' },
    { value: 'saved', label: 'Saved' },
    { value: 'applied', label: 'Applied' },
    { value: 'interview', label: 'Interview' }
  ]

  return (
    <div className="historyMD-page page-enter">
      <main className="historyMD-shell">
        <section className="historyMD-hero">
          <div>
            <p className="historyMD-kicker">History</p>
            <h1>{t('history_saved_title', 'Your saved analyses')}</h1>
            <span>{t('history_saved_intro', 'Review previous job analyses quickly, compare scores, and reopen the full report only when needed.')}</span>
          </div>
          <div className="historyMD-actions">
            <button type="button" className="historyMD-primary" onClick={onNewAnalysis}>+ {t('history_new_check', 'New analysis')}</button>
            {analyses.length > 0 && <button type="button" className="historyMD-ghost historyMD-danger" onClick={() => setDeleteAllOpen(true)}>{t('history_delete_all', 'Delete all')}</button>}
          </div>
        </section>

        {!loading && analyses.length > 0 && (
          <section className="historyMD-stats">
            <StatCard icon="T" label="Total analyses" value={stats.total} helper="Saved reports" />
            <StatCard icon="A" label="Average fit score" value={`${stats.avg}%`} helper="Across all analyses" />
            <StatCard icon="S" label="Strong matches" value={stats.strong} helper="75% and above" />
            <StatCard icon="N" label="Needs work" value={stats.needsWork} helper="Below 55%" />
          </section>
        )}

        <section className="historyMD-card historyMD-master">
          <div className="historyMD-masterHead">
            <div>
              <p className="historyMD-kicker">Saved analyses</p>
              <h2>{filtered.length} result{filtered.length === 1 ? '' : 's'}</h2>
            </div>
            <div className="historyMD-toolbar">
              <label className="historyMD-search">
                <span>⌕</span>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by job, company, location or status..." />
              </label>
              <select value={sortBy} onChange={event => setSortBy(event.target.value)}>
                <option value="recent">Newest</option>
                <option value="score">Highest score</option>
                <option value="company">Company A-Z</option>
              </select>
            </div>
          </div>

          {!loading && analyses.length > 0 && (
            <div className="historyMD-filters">
              {filters.map(item => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}
            </div>
          )}

          {loading && <div className="historyMD-skeletonList">{[1,2,3,4].map(item => <span key={item} />)}</div>}

          {!loading && analyses.length === 0 && (
            <EmptyState title={t('history_no_analyses', 'No analyses yet')} text={t('history_no_analyses_desc', 'Run your first job analysis and it will appear here.')} action={t('history_start_analyzing', 'Start analyzing')} onAction={onNewAnalysis} />
          )}

          {!loading && analyses.length > 0 && filtered.length === 0 && (
            <EmptyState title={t('history_no_filter_match', 'No matching analyses')} text={t('history_try_filter', 'Try another search or filter.')} />
          )}

          {!loading && filtered.length > 0 && (
            <>
              <div className="historyMD-tableWrap">
                <table className="historyMD-table">
                  <thead>
                    <tr>
                      <th>Job title</th>
                      <th>Company</th>
                      <th>Fit score</th>
                      <th>Verdict</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(item => {
                      const tone = scoreTone(item.score)
                      const active = selected?.id === item.id
                      return (
                        <tr key={item.id} className={active ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}>
                          <td>
                            <strong>{item.display.title}</strong>
                            <span>{item.display.location || item.display.workMode || item.display.contract || 'Saved analysis'}</span>
                          </td>
                          <td>{item.display.company || '—'}</td>
                          <td><b className={`historyMD-score historyMD-score--${tone}`}>{item.score}%</b></td>
                          <td><em className={`historyMD-verdict historyMD-verdict--${tone}`}>{verdictLabel(item.result?.overall_verdict || item.result?.recruiter_shortlist?.verdict, t)}</em></td>
                          <td><StatusPill analysis={item} onUpdate={updated => setAnalyses(prev => prev.map(row => row.id === updated.id ? updated : row))} compact /></td>
                          <td><span>{formatDate(item.created_at, lang)}</span><small>{formatTime(item.created_at, lang)}</small></td>
                          <td>
                            <button type="button" onClick={event => { event.stopPropagation(); onSelectAnalysis?.(item) }}>Open</button>
                            <button type="button" className="historyMD-deleteBtn" disabled={deleting === item.id} onClick={event => deleteAnalysis(item.id, event)}>×</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="historyMD-pagination">
                <span>Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                <div>
                  <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>‹</button>
                  <strong>{safePage}</strong>
                  <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>›</button>
                </div>
              </div>
            </>
          )}
        </section>

        {!loading && selected && (
          <section className="historyMD-card historyMD-detail">
            <div className="historyMD-detailHeader">
              <div>
                <p className="historyMD-kicker">Selected analysis</p>
                <h2>{selectedDisplay.title}</h2>
                <span>{selectedDisplay.company || 'Company not specified'} · {formatDate(selected.created_at, lang)} {formatTime(selected.created_at, lang)}</span>
              </div>
              <div className={`historyMD-detailScore historyMD-detailScore--${selectedTone}`}>
                <strong>{selectedScore}%</strong>
                <span>{verdictLabel(selectedResult.overall_verdict || selectedResult.recruiter_shortlist?.verdict, t)}</span>
              </div>
            </div>

            <div className="historyMD-detailGrid">
              <article className="historyMD-detailSummary">
                <p>{selectedDisplay.summary || selectedResult.match_reasoning || 'No summary returned for this analysis.'}</p>
                <div className="historyMD-miniFacts">
                  <span><b>Work mode</b>{selectedDisplay.workMode || 'Not set'}</span>
                  <span><b>Contract</b>{selectedDisplay.contract || 'Not set'}</span>
                  <span><b>Salary</b>{selectedDisplay.salary || 'Not stated'}</span>
                  <span><b>Status</b>{getStatusLabel(getPipelineStatus(selected))}</span>
                </div>
                {(selectedDisplay.recruiterReason || selectedDisplay.nextAction) && (
                  <div className="historyMD-recruiterBox">
                    <strong>Recruiter screening summary</strong>
                    <p>{selectedDisplay.recruiterReason || selectedDisplay.nextReason || 'Review the missing proof points before applying.'}</p>
                  </div>
                )}
              </article>

              <div className="historyMD-keywordPanel">
                <strong>Missing keywords</strong>
                <div>{missingKeywords.length ? missingKeywords.map(item => <span key={item}>{item}</span>) : <p>No missing keywords returned.</p>}</div>
                <strong>Found in CV</strong>
                <div>{foundKeywords.length ? foundKeywords.map(item => <span key={item} className="is-found">{item}</span>) : <p>No found keywords returned.</p>}</div>
              </div>
            </div>

            <div className="historyMD-lists">
              <DetailList title="Quick wins" items={quickWins} empty="No quick wins returned." tone="good" />
              <DetailList title="Gaps to address" items={gaps} empty="No major gaps returned." tone="bad" />
              <DetailList title="Requirements met" items={met} empty="No met requirements returned." tone="good" />
              <DetailList title="Requirements missing" items={unmet} empty="No missing requirements returned." tone="bad" />
            </div>

            <div className="historyMD-detailActions">
              <button type="button" className="historyMD-primary" onClick={() => onSelectAnalysis?.(selected)}>Open full analysis</button>
              <button type="button" className="historyMD-ghost" onClick={onNewAnalysis}>Re-run analysis</button>
              <button type="button" className="historyMD-ghost" onClick={() => onBuildCv?.(selected)} disabled={!onBuildCv}>Generate tailored CV</button>
              <button type="button" className="historyMD-ghost" onClick={() => onGenerateMessage?.(selected)} disabled={!onGenerateMessage}>Generate message</button>
            </div>
          </section>
        )}
      </main>

      {deleteAllOpen && <DeleteAllModal count={analyses.length} onConfirm={handleDeleteAll} onClose={() => setDeleteAllOpen(false)} />}
    </div>
  )
}
