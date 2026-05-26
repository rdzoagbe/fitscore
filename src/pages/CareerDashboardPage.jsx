import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'
import { useDailyChallenge } from '../hooks/useDailyChallenge'
import { useProgressMetrics } from '../hooks/useProgressMetrics'
import { extractScore, getUserDisplayName } from '../utils/progressUtils'
import { getMatchedJobs } from '../utils/jobMatchUtils'
import './CareerDashboardPage.css'

function getTimeGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('greet_morning', 'Good morning')
  if (hour < 18) return t('greet_afternoon', 'Good afternoon')
  return t('greet_evening', 'Good evening')
}

function challengeKey(id, field) {
  return `challenge_${String(id || '').replace(/-/g, '_')}_${field}`
}

function getChallengeText(t, challenge, field, fallback) {
  return t(challengeKey(challenge.id, field), fallback)
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

function ProgressLine({ value }) {
  return (
    <div className="careerDash-progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

function PathCard({ icon, title, text, progress, onClick }) {
  return (
    <button type="button" className="careerDash-path" onClick={onClick}>
      <div className="careerDash-pathTop">
        <span className="careerDash-pathIcon">{icon}</span>
        <span className="careerDash-pathPercent">{progress}%</span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <ProgressLine value={progress} />
    </button>
  )
}

function JourneyStep({ step, index, isNext, setPage, t }) {
  const stateClass = step.done ? 'is-done' : isNext ? 'is-next' : step.locked ? 'is-locked' : 'is-ready'
  return (
    <article className={`careerDash-journeyStep ${stateClass}`}>
      <div className="careerDash-journeyMarker">
        <span>{step.done ? '✓' : index + 1}</span>
      </div>
      <div className="careerDash-journeyCopy">
        <div className="careerDash-journeyTitleRow">
          <strong>{step.title}</strong>
          <em>{step.done ? t('journey_done', 'Done') : isNext ? t('journey_next', 'Next') : step.locked ? t('journey_locked', 'Later') : t('journey_ready', 'Ready')}</em>
        </div>
        <p>{step.text}</p>
        <button type="button" disabled={step.locked && !isNext} onClick={() => setPage?.(step.page)}>
          {step.done ? step.doneLabel : step.actionLabel}
        </button>
      </div>
    </article>
  )
}

function JourneyChecklist({ hasCv, hasAnalysis, analysesCount, bestScore, setPage, t }) {
  const steps = [
    {
      title: t('journey_upload_cv_title', 'Upload your master CV'),
      text: hasCv ? t('journey_upload_cv_done', 'Your CV is saved locally and ready to reuse across job analyses.') : t('journey_upload_cv_text', 'Start by uploading the CV you want Joblytics to use as your source of truth.'),
      actionLabel: t('journey_upload_cv_cta', 'Upload CV'),
      doneLabel: t('journey_update_cv_cta', 'Update CV'),
      page: 'analyzer',
      done: hasCv
    },
    {
      title: t('journey_analyze_job_title', 'Analyze a target job'),
      text: hasAnalysis ? t('journey_analyze_job_done', { count: analysesCount }, `{count} analysis saved. Use your latest score to decide whether to apply or improve first.`) : t('journey_analyze_job_text', 'Paste a job offer or use a URL to get match score, missing keywords and recruiter risks.'),
      actionLabel: t('journey_analyze_job_cta', 'Run ATS analysis'),
      doneLabel: t('journey_analyze_another_cta', 'Analyze another job'),
      page: 'analyzer',
      done: hasAnalysis,
      locked: !hasCv
    },
    {
      title: t('journey_tailor_cv_title', 'Generate a tailored CV version'),
      text: hasAnalysis ? t('journey_tailor_cv_text', 'Turn the analysis gaps into a job-aligned CV draft before you apply.') : t('journey_tailor_cv_locked', 'This unlocks after your first job analysis.'),
      actionLabel: t('journey_tailor_cv_cta', 'Build tailored CV'),
      doneLabel: t('journey_tailor_cv_cta', 'Build tailored CV'),
      page: 'cv-builder',
      done: false,
      locked: !hasAnalysis
    },
    {
      title: t('journey_generate_message_title', 'Generate your application message'),
      text: hasAnalysis ? t('journey_generate_message_text', 'Create a cover letter or recruiter message using the same job context and CV proof.') : t('journey_generate_message_locked', 'This becomes stronger once a job has been analyzed.'),
      actionLabel: t('journey_generate_message_cta', 'Open CV Coach'),
      doneLabel: t('journey_generate_message_cta', 'Open CV Coach'),
      page: 'coach',
      done: false,
      locked: !hasAnalysis
    },
    {
      title: t('journey_track_application_title', 'Track the application'),
      text: hasAnalysis ? t('journey_track_application_text', 'Save every role in History so you can follow status, score and next action.') : t('journey_track_application_locked', 'History fills up after you run analyses.'),
      actionLabel: t('journey_track_application_cta', 'Open History'),
      doneLabel: t('journey_track_application_cta', 'Open History'),
      page: 'history',
      done: hasAnalysis,
      locked: !hasAnalysis
    },
    {
      title: t('journey_sync_updates_title', 'Sync recruiter updates'),
      text: t('journey_sync_updates_text', 'Connect mail and calendar to detect replies, interviews, rejections and follow-ups.'),
      actionLabel: t('journey_sync_updates_cta', 'Open Smart Sync'),
      doneLabel: t('journey_sync_updates_cta', 'Open Smart Sync'),
      page: 'messages',
      done: false,
      locked: false
    }
  ]

  const doneCount = steps.filter(step => step.done).length
  const nextIndex = steps.findIndex(step => !step.done && !step.locked)
  const progress = Math.round((doneCount / steps.length) * 100)
  const nextStep = steps[nextIndex >= 0 ? nextIndex : steps.length - 1]

  return (
    <section className="careerDash-card careerDash-journey">
      <div className="careerDash-cardHeader careerDash-journeyHeader">
        <div>
          <p className="careerDash-kicker">{t('journey_kicker', 'Command center')}</p>
          <h2>{t('journey_title', 'Your job-search workflow')}</h2>
          <p>{t('journey_desc', 'Follow this sequence to move from a generic CV to a tracked, job-specific application.')}</p>
        </div>
        <div className="careerDash-journeyScore">
          <strong>{progress}%</strong>
          <span>{t('journey_complete', 'complete')}</span>
        </div>
      </div>

      <div className="careerDash-nextActionBox">
        <div>
          <p>{t('journey_next_action', 'Recommended next action')}</p>
          <strong>{nextStep.title}</strong>
          <span>{bestScore ? t('journey_score_context', { score: bestScore }, `Best score so far: {score}%. Keep improving the next application.`) : t('journey_no_score_context', 'No score yet. Start with one analysis to unlock better guidance.')}</span>
        </div>
        <button type="button" onClick={() => setPage?.(nextStep.page)}>{nextStep.actionLabel}</button>
      </div>

      <div className="careerDash-journeyGrid">
        {steps.map((step, index) => (
          <JourneyStep key={step.title} step={step} index={index} isNext={index === nextIndex} setPage={setPage} t={t} />
        ))}
      </div>
    </section>
  )
}

function MatchedJobCard({ job, onAnalyze, t }) {
  const prefix = `jobmatch_${job.key}`
  return (
    <article className="careerDash-matchCard">
      <div className="careerDash-matchTop">
        <div>
          <p>{t(`${prefix}_category`, job.category)}</p>
          <h3>{t(`${prefix}_title`, job.title)}</h3>
          <span>{t(job.level.includes('Senior') ? 'jobmatch_level_senior_manager' : 'jobmatch_level_manager', job.level)}</span>
        </div>
        <strong>{job.score}%</strong>
      </div>

      <p className="careerDash-matchReason">{t(`${prefix}_reason`, job.reasons[0])}</p>

      <div className="careerDash-matchKeywords">
        {(job.matchedKeywords.length ? job.matchedKeywords : job.keywords.slice(0, 4)).map(keyword => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>

      <div className="careerDash-matchActions">
        <a href={job.searchUrl} target="_blank" rel="noreferrer">{t('dash_find_roles')}</a>
        <button type="button" onClick={onAnalyze}>{t('dash_analyze_job')}</button>
      </div>
    </article>
  )
}

export default function CareerDashboardPage({ setPage }) {
  const { user } = useAuth()
  const { t } = useLang()
  const { cvFile } = useCvPersist()
  const { challenge, progress, completedToday, completeChallenge } = useDailyChallenge()
  const metrics = useProgressMetrics(progress)
  const [openChallenge, setOpenChallenge] = useState(true)

  const name = getUserDisplayName(user)
  const greeting = getTimeGreeting(t)
  const weeklyPercent = Math.round(((metrics.weeklyCompleted || 0) / (metrics.weeklyTarget || 5)) * 100)
  const recent = metrics.analyses.slice(0, 4)
  const matchedJobs = getMatchedJobs(metrics.analyses)
  const matchSourceLabel = matchedJobs[0]?.isProfileBased ? t('dash_based_saved') : t('dash_starter_recs')

  return (
    <div className="careerDash-page">
      <div className="careerDash-bg careerDash-bgOne" />
      <div className="careerDash-bg careerDash-bgTwo" />

      <main className="careerDash-shell">
        <section className="careerDash-hero">
          <div className="careerDash-heroText">
            <div className="careerDash-pill">
              <span /> {t('dash_pill')}
            </div>

            <h1>
              {greeting}, <br />
              <em>{name}</em>
            </h1>

            <p>{t('dash_intro')}</p>

            <div className="careerDash-actions">
              <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>
                {t('dash_run_ats')}
              </button>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('coach')}>
                {t('dash_open_coach')}
              </button>
            </div>
          </div>

          <aside className="careerDash-heroPanel">
            <div className="careerDash-scoreCircle">
              <span>{metrics.bestScore || 0}</span>
              <small>{t('best_score')}</small>
            </div>

            <div>
              <p className="careerDash-panelLabel">{t('dash_next_action')}</p>
              <h2>{cvFile ? t('dash_complete_challenge') : t('journey_upload_cv_title', 'Upload your master CV')}</h2>
              <p>{cvFile ? t('dash_compound') : t('journey_upload_cv_text', 'Start by uploading the CV you want Joblytics to use as your source of truth.')}</p>
            </div>
          </aside>
        </section>

        <section className="careerDash-stats">
          <ScoreCard label={t('dash_ats_checks')} value={metrics.analysesCount || 0} helper={t('dash_total_analyses')} />
          <ScoreCard label={t('dash_average_score')} value={metrics.averageScore ? `${metrics.averageScore}%` : '—'} helper={t('dash_across_checks')} />
          <ScoreCard label={t('dash_best_score')} value={metrics.bestScore ? `${metrics.bestScore}%` : '—'} helper={t('dash_highest_match')} tone="accent" />
          <ScoreCard label={t('dash_current_streak')} value={`${metrics.currentStreak || 0}d`} helper={t('dash_career_actions')} tone="warm" />
        </section>

        <JourneyChecklist
          hasCv={!!cvFile}
          hasAnalysis={(metrics.analysesCount || 0) > 0}
          analysesCount={metrics.analysesCount || 0}
          bestScore={metrics.bestScore || 0}
          setPage={setPage}
          t={t}
        />

        <section className="careerDash-card careerDash-matchedJobs">
          <div className="careerDash-cardHeader">
            <div>
              <p className="careerDash-kicker">{t('dash_matched_jobs')} · {matchSourceLabel}</p>
              <h2>{t('dash_roles_aligned')}</h2>
              <p>{t('dash_roles_desc')}</p>
            </div>
            <button type="button" className="careerDash-linkBtn" onClick={() => setPage?.('analyzer')}>
              {t('dash_analyze_job')}
            </button>
          </div>

          <div className="careerDash-matchGrid">
            {matchedJobs.map(job => (
              <MatchedJobCard key={job.title} job={job} t={t} onAnalyze={() => setPage?.('analyzer')} />
            ))}
          </div>
        </section>

        <section className="careerDash-grid">
          <div className="careerDash-main">
            <article className="careerDash-card careerDash-challenge">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">{t('this_week', 'Today')} · {challenge.estimatedMinutes} min</p>
                  <h2>{getChallengeText(t, challenge, 'title', challenge.title)}</h2>
                  <p>{getChallengeText(t, challenge, 'desc', challenge.description)}</p>
                </div>
                <span className="careerDash-tag">{challenge.category}</span>
              </div>

              <div className="careerDash-why">
                <strong>{t('dash_why_matters')}</strong>
                <span>{getChallengeText(t, challenge, 'why', challenge.why)}</span>
              </div>

              {openChallenge && (
                <div className="careerDash-challengeBody">
                  <p>{getChallengeText(t, challenge, 'task', challenge.task)}</p>

                  <div className="careerDash-examples">
                    <div>
                      <span>{t('dash_before')}</span>
                      <p>{getChallengeText(t, challenge, 'before', challenge.exampleBefore)}</p>
                    </div>
                    <div>
                      <span>{t('dash_after')}</span>
                      <p>{getChallengeText(t, challenge, 'after', challenge.exampleAfter)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="careerDash-cardActions">
                <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setOpenChallenge(value => !value)}>
                  {openChallenge ? t('dash_hide_example') : t('dash_show_example')}
                </button>

                <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={completeChallenge} disabled={completedToday}>
                  {completedToday ? t('dash_completed_today') : t('dash_mark_complete')}
                </button>
              </div>
            </article>

            <article className="careerDash-card">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">{t('dash_guided_paths')}</p>
                  <h2>{t('dash_choose_move')}</h2>
                </div>
              </div>

              <div className="careerDash-pathGrid">
                <PathCard icon="CV" title={t('dash_path_cv')} text={t('dash_path_cv_desc')} progress={42} onClick={() => setPage?.('coach')} />
                <PathCard icon="INT" title={t('dash_path_interview')} text={t('dash_path_interview_desc')} progress={18} onClick={() => setPage?.('coach')} />
                <PathCard icon="JOB" title={t('dash_path_apply')} text={t('dash_path_apply_desc')} progress={56} onClick={() => setPage?.('analyzer')} />
              </div>
            </article>

            <article className="careerDash-card">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">{t('dash_recent_activity')}</p>
                  <h2>{t('dash_latest_analyses')}</h2>
                </div>
                <button type="button" className="careerDash-linkBtn" onClick={() => setPage?.('history')}>
                  {t('dash_view_history')}
                </button>
              </div>

              {recent.length ? (
                <div className="careerDash-recentList">
                  {recent.map((item, index) => {
                    const score = extractScore(item)
                    const title = item?.jobTitle || item?.title || item?.role || item?.result?.job_context?.title || `${t('dash_analysis')} ${index + 1}`
                    const company = item?.company || item?.result?.job_context?.company || t('dash_recent_check')

                    return (
                      <button key={`${title}-${index}`} type="button" className="careerDash-recentRow" onClick={() => setPage?.('history')}>
                        <div>
                          <strong>{title}</strong>
                          <span>{company}</span>
                        </div>
                        <em>{score ? `${score}%` : '—'}</em>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="careerDash-empty">
                  <h3>{t('no_analyses')}</h3>
                  <p>{t('dash_no_analyses_desc2')}</p>
                  <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>
                    {t('dash_run_first')}
                  </button>
                </div>
              )}
            </article>
          </div>

          <aside className="careerDash-side">
            <article className="careerDash-card careerDash-sideCard">
              <p className="careerDash-kicker">{t('dash_weekly_goal')}</p>
              <div className="careerDash-weeklyTop">
                <strong>{metrics.weeklyCompleted || 0}/{metrics.weeklyTarget || 5}</strong>
                <span>{weeklyPercent}%</span>
              </div>
              <ProgressLine value={weeklyPercent} />
              <p>{t('dash_weekly_desc')}</p>
            </article>

            <article className="careerDash-card careerDash-sideCard">
              <p className="careerDash-kicker">{t('dash_momentum')}</p>
              <div className="careerDash-momentum">
                <div>
                  <strong>{metrics.currentStreak || 0}</strong>
                  <span>{t('dash_current_streak_short')}</span>
                </div>
                <div>
                  <strong>{metrics.bestStreak || 0}</strong>
                  <span>{t('dash_best_streak')}</span>
                </div>
              </div>
            </article>

            <article className="careerDash-card careerDash-sideCard careerDash-coachCard">
              <p className="careerDash-kicker">{t('dash_profile_import')}</p>
              <h3>{t('dash_profile_next')}</h3>
              <p>{t('dash_profile_desc')}</p>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('profile')}>
                {t('dash_improve_profile')}
              </button>
            </article>
          </aside>
        </section>
      </main>
    </div>
  )
}