import React, { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'
import { useProgressMetrics } from '../hooks/useProgressMetrics'
import { extractScore, getUserDisplayName } from '../utils/progressUtils'
import './CareerDashboardPage.css'
import './dashboard-simplified.css'

const FREE_MONTHLY_LIMIT = 3

function getTimeGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('greet_morning', 'Good morning')
  if (hour < 18) return t('greet_afternoon', 'Good afternoon')
  return t('greet_evening', 'Good evening')
}

function getUserPlan(user) {
  const meta = { ...(user?.user_metadata || {}), ...(user?.app_metadata || {}) }
  const status = String(meta.subscription_status || meta.stripe_subscription_status || '').toLowerCase()
  const raw = String(meta.subscription_plan || meta.plan || meta.price_plan || meta.tier || '').toLowerCase()
  const isPaid = ['pro', 'premium', 'professional', 'starter', 'plus', 'basic', 'paid'].includes(raw) &&
    (!status || ['active', 'trialing', 'paid'].includes(status))
  return isPaid ? raw : 'free'
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
  const title = item?.job_title || item?.jobTitle || item?.title || item?.role || item?.result?.job_context?.title || `${t('dash_analysis', 'Analysis')} ${index + 1}`
  const company = item?.result?.job_context?.company || item?.company || ''
  const scoreColor = score >= 70 ? '#557C64' : score >= 50 ? '#B9863B' : '#B85C55'
  return (
    <button type="button" className="dashLite-recentRow" onClick={onClick} title="Open this analysis">
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</strong>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company || t('dash_recent_check', 'Recent check')}</span>
      </div>
      <em style={{ color: score ? scoreColor : undefined, flexShrink: 0 }}>{score ? `${score}%` : '—'}</em>
    </button>
  )
}

function UsageBanner({ used, limit, onAnalyze }) {
  const remaining = Math.max(0, limit - used)
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const urgent = remaining <= 1
  return (
    <div style={{
      padding: '14px 18px',
      borderRadius: 16,
      border: `1.5px solid ${urgent ? 'rgba(184,92,85,0.35)' : 'rgba(181,102,60,0.25)'}`,
      background: urgent ? 'rgba(184,92,85,0.06)' : 'rgba(181,102,60,0.06)',
      marginTop: 14
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: urgent ? '#B85C55' : '#B5663C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {urgent ? '⚠ Almost out' : 'Free plan usage'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? '#B85C55' : '#B5663C' }}>
          {used} / {limit} used
        </span>
      </div>
      <div style={{ height: 5, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: urgent ? '#B85C55' : '#B5663C', borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>
        {remaining === 0
          ? 'You've used all your free analyses this month. Upgrade to continue.'
          : `${remaining} analysis${remaining === 1 ? '' : 'es'} remaining this month on the free plan.`}
      </p>
      {remaining > 0
        ? <button type="button" onClick={onAnalyze} style={{ fontSize: 12, fontWeight: 800, color: '#B5663C', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>Use one now →</button>
        : <button type="button" onClick={() => {}} style={{ fontSize: 12, fontWeight: 800, color: '#B85C55', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>Upgrade plan →</button>}
    </div>
  )
}

function MissingKeywordsWidget({ keywords, onCoach }) {
  if (!keywords.length) return null
  return (
    <div style={{ padding: '14px 18px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-input)', marginTop: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 900, color: '#B5663C', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
        Missing from your latest CV
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {keywords.map(k => (
          <span key={k} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(184,92,85,0.09)', border: '1px solid rgba(184,92,85,0.22)', color: '#B85C55', fontSize: 12, fontWeight: 800 }}>
            + {k}
          </span>
        ))}
      </div>
      <button type="button" onClick={onCoach} style={{ fontSize: 12, fontWeight: 800, color: '#B5663C', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
        Fix in CV Coach →
      </button>
    </div>
  )
}

export default function CareerDashboardPage({ setPage, onOpenAnalysis }) {
  const { user } = useAuth()
  const { t } = useLang()
  const { cvFile } = useCvPersist()
  const metrics = useProgressMetrics({})
  const name = getUserDisplayName(user)
  const greeting = getTimeGreeting(t)
  const recent = metrics.analyses.slice(0, 3)
  const plan = getUserPlan(user)
  const nextAction = cvFile
    ? t('dash_lite_next_analyze', 'Analyze your next target job')
    : t('dash_lite_next_upload', 'Upload your master CV first')

  const thisMonthUsed = useMemo(() => {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return metrics.analyses.filter(a => new Date(a.created_at) >= start).length
  }, [metrics.analyses])

  const topMissingKeywords = useMemo(() => {
    const latest = metrics.analyses[0]
    if (!latest?.result) return []
    const r = latest.result
    return [
      ...(r.keyword_match?.missing_required || []),
      ...(r.keywords_analysis?.missing_keywords || []),
      ...(r.strict_ats_result?.analysis?.missing_skills || [])
    ].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 4)
  }, [metrics.analyses])

  const showUsageBanner = plan === 'free' && thisMonthUsed > 0

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
                {recent.map((item, index) => (
                  <RecentAnalysis
                    key={item?.id || index}
                    item={item}
                    index={index}
                    t={t}
                    onClick={() => onOpenAnalysis ? onOpenAnalysis(item) : setPage?.('history')}
                  />
                ))}
              </div>
            ) : (
              <div className="careerDash-empty dashLite-empty">
                <h3>{t('no_analyses', 'No analyses yet')}</h3>
                <p>{t('dash_no_analyses_desc2', 'Run your first analysis and it will appear here.')}</p>
                <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>{t('dash_run_first', 'Run first analysis')}</button>
              </div>
            )}

            {showUsageBanner && (
              <UsageBanner used={thisMonthUsed} limit={FREE_MONTHLY_LIMIT} onAnalyze={() => setPage?.('analyzer')} />
            )}

            {recent.length > 0 && (
              <MissingKeywordsWidget keywords={topMissingKeywords} onCoach={() => setPage?.('coach')} />
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}
