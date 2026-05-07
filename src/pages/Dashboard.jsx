import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import ScoreHistoryChart from '../components/ScoreHistoryChart'
import StatusPill from '../components/StatusPill'
import DeleteAllModal from '../components/DeleteAllModal'
import './HistoryPage.css'

function scoreValue(analysis) {
  const score = Number(analysis?.score)
  return Number.isFinite(score) ? Math.round(score) : 0
}

function scoreColor(score) {
  if (score >= 70) return '#4caf7d'
  if (score >= 50) return '#f5a623'
  return '#ff6b6b'
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

  useEffect(() => {
    fetchAnalyses()
  }, [])

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
    setDeleting(null)
  }

  const handleDeleteAll = async () => {
    if (!user) throw new Error('Not signed in')
    const { error } = await supabase.from('analyses').delete().eq('user_id', user.id)
    if (error) throw error
    setAnalyses([])
    setDeleteAllOpen(false)
    setDeleting(null)
  }

  const localeMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT' }
  const formatDate = value => new Date(value).toLocaleDateString(localeMap[lang] || 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })

  const verdictLabel = value => ({
    likely_passed: t('likely_passed'),
    borderline: t('borderline'),
    likely_filtered: t('likely_filtered')
  })[value] || t('unknown')

  const stats = useMemo(() => {
    const scores = analyses.map(scoreValue)
    const avgScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
    const bestScore = scores.length ? Math.max(...scores) : 0
    const passedCount = analyses.filter(item => item.result?.overall_verdict === 'likely_passed').length
    const borderlineCount = analyses.filter(item => item.result?.overall_verdict === 'borderline').length
    const filteredCount = analyses.filter(item => item.result?.overall_verdict === 'likely_filtered').length
    return { avgScore, bestScore, passedCount, borderlineCount, filteredCount }
  }, [analyses])

  const total = analyses.length || 1
  const passedPercent = Math.round((stats.passedCount / total) * 100)
  const borderlinePercent = Math.round((stats.borderlineCount / total) * 100)
  const filteredPercent = Math.round((stats.filteredCount / total) * 100)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return analyses
      .filter(item => {
        const matchFilter = filter === 'all' || item.result?.overall_verdict === filter
        const title = item.job_title || item.result?.job_context?.title || ''
        const company = item.result?.job_context?.company || ''
        const url = item.job_url || ''
        const matchSearch = !query || title.toLowerCase().includes(query) || company.toLowerCase().includes(query) || url.toLowerCase().includes(query)
        return matchFilter && matchSearch
      })
      .sort((a, b) => sortBy === 'priority' ? scoreValue(b) - scoreValue(a) : new Date(b.created_at) - new Date(a.created_at))
  }, [analyses, filter, search, sortBy])

  const filters = [
    { value: 'all', label: t('filter_all') },
    { value: 'likely_passed', label: t('filter_passed') },
    { value: 'borderline', label: t('filter_borderline') },
    { value: 'likely_filtered', label: t('filter_filtered') }
  ]

  return (
    <div className="historyWide-page page-enter">
      <div className="historyWide-glow historyWide-glowOne" />
      <div className="historyWide-glow historyWide-glowTwo" />

      <main className="historyWide-shell">
        <section className="historyWide-hero">
          <div>
            <p className="historyWide-kicker">{t('application_intelligence')}</p>
            <h1>{t('history_board')}</h1>
            <p>{t('history_board_desc')}</p>

            <div className="historyWide-actions">
              <button type="button" className="historyWide-primaryBtn" onClick={onNewAnalysis}>{t('new_ats_check')}</button>
              {analyses.length > 0 && <button type="button" className="historyWide-dangerBtn" onClick={() => setDeleteAllOpen(true)}>{t('delete_all')}</button>}
            </div>
          </div>

          <aside className="historyWide-heroPanel">
            <div className="historyWide-orb">
              <strong>{stats.avgScore}</strong>
              <span>{t('avg_score_short')}</span>
            </div>
            <div>
              <p>{t('current_archive')}</p>
              <h2>{analyses.length} {t('analyses_label')}</h2>
              <span>{filtered.length} {t('visible_after_filters')}</span>
            </div>
          </aside>
        </section>

        {!loading && analyses.length > 0 && (
          <section className="historyWide-stats">
            <StatCard label={t('average_score')} value={`${stats.avgScore}%`} helper={t('across_all_checks')} />
            <StatCard label={t('best_score')} value={`${stats.bestScore}%`} helper={t('highest_role_match')} />
            <StatCard label={t('likely_passed')} value={`${stats.passedCount}/${analyses.length}`} helper={t('strong_applications')} />
            <StatCard label={t('visible_results')} value={filtered.length} helper={t('current_filtered_view')} />
          </section>
        )}

        {!loading && analyses.length >= 2 && (
          <section className="historyWide-insights">
            <article className="historyWide-card historyWide-chartCard">
              <p className="historyWide-kicker">{t('score_trend')}</p>
              <h2>{t('progress_over_time')}</h2>
              <div className="historyWide-chartBox"><ScoreHistoryChart analyses={analyses} t={t} /></div>
            </article>

            <article className="historyWide-card">
              <p className="historyWide-kicker">{t('verdict_breakdown_premium')}</p>
              <h2>{t('match_quality')}</h2>
              <div className="historyWide-progressStack">
                <ProgressLine label={t('likely_passed')} value={passedPercent} color="#4caf7d" />
                <ProgressLine label={t('borderline')} value={borderlinePercent} color="#f5a623" />
                <ProgressLine label={t('likely_filtered')} value={filteredPercent} color="#ff6b6b" />
              </div>
            </article>
          </section>
        )}

        <section className="historyWide-card historyWide-resultsCard">
          <div className="historyWide-sectionHead">
            <div>
              <p className="historyWide-kicker">{t('saved_analyses')}</p>
              <h2>{t('saved_analyses_title')}</h2>
              <p>{t('archive_help')}</p>
            </div>
          </div>

          {!loading && analyses.length > 0 && (
            <div className="historyWide-toolbar">
              <label className="historyWide-search">
                <span>⌕</span>
                <input type="text" placeholder={t('search_placeholder')} value={search} onChange={event => setSearch(event.target.value)} />
              </label>

              <div className="historyWide-filterGroup">
                {filters.map(item => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}
              </div>

              <button type="button" className="historyWide-sortBtn" onClick={() => setSortBy(value => value === 'recent' ? 'priority' : 'recent')}>
                {sortBy === 'priority' ? `⭐ ${t('sort_priority')}` : `🕐 ${t('sort_recent')}`}
              </button>
            </div>
          )}

          {loading && <div className="historyWide-grid">{[1, 2, 3, 4, 5, 6].map(item => <div key={item} className="historyWide-skeleton" />)}</div>}

          {!loading && analyses.length === 0 && (
            <div className="historyWide-empty">
              <div>📋</div>
              <h3>{t('no_analyses_yet')}</h3>
              <p>{t('no_analyses_desc')}</p>
              <button type="button" className="historyWide-primaryBtn" onClick={onNewAnalysis}>{t('start_analyzing')}</button>
            </div>
          )}

          {!loading && analyses.length > 0 && filtered.length === 0 && (
            <div className="historyWide-empty">
              <h3>{t('no_match_filter_premium')}</h3>
              <p>{t('try_another_filter')}</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="historyWide-grid">
              {filtered.map(analysis => {
                const score = scoreValue(analysis)
                const color = scoreColor(score)
                const title = analysis.job_title || analysis.result?.job_context?.title || (() => { try { return new URL(analysis.job_url).hostname.replace('www.', '') } catch { return t('job_analysis') } })()
                const company = analysis.result?.job_context?.company
                const location = analysis.result?.job_context?.location

                return (
                  <article key={analysis.id} className="historyWide-item" onClick={() => onSelectAnalysis(analysis)}>
                    <div className="historyWide-itemTop">
                      <div className="historyWide-score" style={{ color, borderColor: color }}>{score}%</div>
                      <button type="button" className="historyWide-delete" onClick={event => deleteAnalysis(analysis.id, event)} disabled={deleting === analysis.id} aria-label={t('delete_analysis')}>×</button>
                    </div>

                    <h3>{title}</h3>
                    {company && company !== 'Not specified' && <p className="historyWide-company">@ {company}</p>}
                    <div className="historyWide-meta">
                      <span style={{ color, borderColor: `${color}55`, background: `${color}18` }}>{verdictLabel(analysis.result?.overall_verdict)}</span>
                      <em>{formatDate(analysis.created_at)}</em>
                      {location && location !== 'Not specified' && <em>📍 {location.split(',')[0]}</em>}
                    </div>
                    <div className="historyWide-status">
                      <StatusPill analysis={analysis} onUpdate={updated => setAnalyses(prev => prev.map(item => item.id === updated.id ? updated : item))} compact />
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {deleteAllOpen && <DeleteAllModal count={analyses.length} onConfirm={handleDeleteAll} onClose={() => setDeleteAllOpen(false)} />}
    </div>
  )
}
