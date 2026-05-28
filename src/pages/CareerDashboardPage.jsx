import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'
import { useProgressMetrics } from '../hooks/useProgressMetrics'
import { extractScore, getUserDisplayName } from '../utils/progressUtils'
import './CareerDashboardPage.css'
import './dashboard-simplified.css'

function getTimeGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('greet_morning', 'Good morning')
  if (hour < 18) return t('greet_afternoon', 'Good afternoon')
  return t('greet_evening', 'Good evening')
}

function ScoreCard({ label, value, helper, tone = 'default' }) {
  return (
    <article className={`careerDash-stat careerDash-stat--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{helper}</span>
    </article>
  )
}

function QuickAction({ icon, title, text, action, primary, onClick }) {
  return (
    <button type="button" className={`dashLite-action ${primary ? 'is-primary' : ''}`} onClick={onClick}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
      <em>{action}</em>
    </button>
  )
}

function RecentAnalysis({ item, index, t, onClick }) {
  const score = extractScore(item)
  const title = item?.jobTitle || item?.title || item?.role || item?.result?.job_context?.title || `${t('dash_analysis', 'Analysis')} ${index + 1}`
  const company = item?.company || item?.result?.job_context?.company || t('dash_recent_check', 'Recent check')
  return (
    <button type="button" className="dashLite-recentRow" onClick={onClick}>
      <div>
        <strong>{title}</strong>
        <span>{company}</span>
      </div>
      <em>{score ? `${score}%` : '—'}</em>
    </button>
  )
}

export default function CareerDashboardPage({ setPage }) {
  const { user } = useAuth()
  const { t } = useLang()
  const { cvFile } = useCvPersist()
  const metrics = useProgressMetrics({})
  const name = getUserDisplayName(user)
  const greeting = getTimeGreeting(t)
  const recent = metrics.analyses.slice(0, 3)
  const nextAction = cvFile
    ? t('dash_lite_next_analyze', 'Analyze your next target job')
    : t('dash_lite_next_upload', 'Upload your master CV first')

  return (
    <div className="careerDash-page dashLite-page">
      <div className="careerDash-bg careerDash-bgOne" />
      <div className="careerDash-bg careerDash-bgTwo" />

      <main className="careerDash-shell dashLite-shell">
        <section className="careerDash-hero dashLite-hero">
          <div className="careerDash-heroText dashLite-heroText">
            <div className="careerDash-pill"><span /> {t('career_workspace', 'Career growth workspace')}</div>
            <h1>{greeting}, <br /><em>{name}</em></h1>
            <p>{t('dash_lite_intro', 'Use Joblytics as a focused job-search command center: analyze a role, improve your CV, track replies, then follow up with confidence.')}</p>
            <div className="careerDash-actions">
              <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>{t('dash_run_ats', 'Analyze a job')}</button>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('history')}>{t('dash_view_history', 'View history')}</button>
            </div>
          </div>

          <aside className="careerDash-heroPanel dashLite-nextPanel">
            <div className="careerDash-scoreCircle"><span>{metrics.bestScore || 0}</span><small>{t('best_score', 'Best score')}</small></div>
            <div>
              <p className="careerDash-panelLabel">{t('dash_next_action', 'Next action')}</p>
              <h2>{nextAction}</h2>
              <p>{cvFile ? t('dash_lite_next_text', 'Paste the job description, compare fit, then generate the tailored CV or message from the result.') : t('dash_lite_cv_text', 'A saved CV makes each analysis faster and gives the AI a consistent source of truth.')}</p>
            </div>
          </aside>
        </section>

        <section className="careerDash-stats dashLite-stats">
          <ScoreCard label={t('dash_ats_checks', 'ATS checks')} value={metrics.analysesCount || 0} helper={t('dash_total_analyses', 'Total analyses')} />
          <ScoreCard label={t('dash_average_score', 'Average score')} value={metrics.averageScore ? `${metrics.averageScore}%` : '—'} helper={t('dash_across_checks', 'Across checks')} />
          <ScoreCard label={t('dash_best_score', 'Best score')} value={metrics.bestScore ? `${metrics.bestScore}%` : '—'} helper={t('dash_highest_match', 'Highest match')} tone="accent" />
          <ScoreCard label={t('dash_lite_cv_status', 'CV status')} value={cvFile ? 'Ready' : 'Missing'} helper={cvFile ? cvFile.name : t('dash_lite_upload_needed', 'Upload needed')} tone="warm" />
        </section>

        <section className="dashLite-grid">
          <div className="careerDash-card dashLite-actionsCard">
            <div className="careerDash-cardHeader">
              <div>
                <p className="careerDash-kicker">{t('dash_lite_command_center', 'Command center')}</p>
                <h2>{t('dash_lite_choose_action', 'Choose your next move')}</h2>
                <p>{t('dash_lite_choose_desc', 'The detailed work now lives in the right pages. This home screen stays light and action-focused.')}</p>
              </div>
            </div>
            <div className="dashLite-actionsGrid">
              <QuickAction icon="AI" title={t('dash_lite_analyze_title', 'Analyze a job')} text={t('dash_lite_analyze_text', 'Check fit, gaps, recruiter risks and next action.')} action={t('dash_lite_start', 'Start analysis')} primary onClick={() => setPage?.('analyzer')} />
              <QuickAction icon="H" title={t('dash_lite_history_title', 'Review history')} text={t('dash_lite_history_text', 'Open saved analyses in the compact review table.')} action={t('dash_lite_open_history', 'Open history')} onClick={() => setPage?.('history')} />
              <QuickAction icon="CV" title={t('dash_lite_coach_title', 'Improve CV & messages')} text={t('dash_lite_coach_text', 'Generate cover letters, outreach and follow-ups.')} action={t('dash_lite_open_coach', 'Open CV Coach')} onClick={() => setPage?.('coach')} />
              <QuickAction icon="M" title={t('dash_lite_sync_title', 'Run Smart Sync')} text={t('dash_lite_sync_text', 'Detect replies, interviews, rejections and follow-ups.')} action={t('dash_lite_open_messages', 'Open messages')} onClick={() => setPage?.('messages')} />
            </div>
          </div>

          <aside className="careerDash-card dashLite-recentCard">
            <div className="careerDash-cardHeader">
              <div>
                <p className="careerDash-kicker">{t('dash_recent_activity', 'Recent activity')}</p>
                <h2>{t('dash_latest_analyses', 'Latest analyses')}</h2>
              </div>
              <button type="button" className="careerDash-linkBtn" onClick={() => setPage?.('history')}>{t('dash_view_history', 'View history')}</button>
            </div>

            {recent.length ? (
              <div className="dashLite-recentList">
                {recent.map((item, index) => <RecentAnalysis key={`${item?.id || index}`} item={item} index={index} t={t} onClick={() => setPage?.('history')} />)}
              </div>
            ) : (
              <div className="careerDash-empty dashLite-empty">
                <h3>{t('no_analyses', 'No analyses yet')}</h3>
                <p>{t('dash_no_analyses_desc2', 'Run your first analysis and it will appear here.')}</p>
                <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>{t('dash_run_first', 'Run first analysis')}</button>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}
