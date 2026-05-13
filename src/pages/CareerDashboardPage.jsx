import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useDailyChallenge } from '../hooks/useDailyChallenge'
import { useProgressMetrics } from '../hooks/useProgressMetrics'
import { useUsageSummary } from '../hooks/useUsageSummary'
import { extractScore, getUserDisplayName } from '../utils/progressUtils'
import { getLocalizedChallenge } from '../i18n/premiumTranslations'
import UsageLimitCard from '../components/UsageLimitCard'
import CareerNextAction from '../components/CareerNextAction'
import CareerProgressFlow from '../components/CareerProgressFlow'
import '../components/UsageLimitCard.css'
import '../components/CareerNextAction.css'
import '../components/CareerProgressFlow.css'
import './CareerDashboardPage.css'

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

function getGreeting(t) {
  const hour = new Date().getHours()
  if (hour < 12) return t('good_morning')
  if (hour < 18) return t('good_afternoon')
  return t('good_evening')
}

export default function CareerDashboardPage({ setPage }) {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const daily = useDailyChallenge()
  const challenge = getLocalizedChallenge(daily.challenge, lang)
  const metrics = useProgressMetrics(daily.progress)
  const usage = useUsageSummary()
  const [openChallenge, setOpenChallenge] = useState(true)

  const name = getUserDisplayName(user)
  const weeklyPercent = Math.round(((metrics.weeklyCompleted || 0) / (metrics.weeklyTarget || 5)) * 100)
  const recent = metrics.analyses.slice(0, 4)

  return (
    <div className="careerDash-page">
      <div className="careerDash-bg careerDash-bgOne" />
      <div className="careerDash-bg careerDash-bgTwo" />

      <main className="careerDash-shell">
        <section className="careerDash-hero">
          <div className="careerDash-heroText">
            <div className="careerDash-pill">
              <span /> {t('career_growth_dashboard')}
            </div>

            <h1>
              {getGreeting(t)}, <br />
              <em>{name}</em>
            </h1>

            <p>{t('career_dash_intro')}</p>

            <div className="careerDash-actions">
              <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>
                {t('run_ats_check')}
              </button>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('coach')}>
                {t('open_cv_coach')}
              </button>
            </div>
          </div>

          <aside className="careerDash-heroPanel">
            <div className="careerDash-scoreCircle">
              <span>{metrics.bestScore || 0}</span>
              <small>{t('best_score_label')}</small>
            </div>

            <div>
              <p className="careerDash-panelLabel">{t('next_recommended_action')}</p>
              <h2>{t('complete_todays_challenge')}</h2>
              <p>{t('daily_improvements_compound')}</p>
            </div>
          </aside>
        </section>

        <CareerNextAction metrics={metrics} setPage={setPage} />

        <section className="careerDash-stats">
          <ScoreCard label={t('ats_checks')} value={metrics.analysesCount || 0} helper={t('total_analyses')} />
          <ScoreCard label={t('average_score')} value={metrics.averageScore ? `${metrics.averageScore}%` : '—'} helper={t('across_checks')} />
          <ScoreCard label={t('best_score')} value={metrics.bestScore ? `${metrics.bestScore}%` : '—'} helper={t('highest_match')} tone="accent" />
          <ScoreCard label={t('current_streak')} value={`${metrics.currentStreak || 0}d`} helper={t('career_actions')} tone="warm" />
        </section>

        <CareerProgressFlow metrics={metrics} usage={usage} setPage={setPage} />

        <section className="careerDash-grid">
          <div className="careerDash-main">
            <article className="careerDash-card careerDash-challenge">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">{t('todays_challenge')} · {challenge.estimatedMinutes} min</p>
                  <h2>{challenge.title}</h2>
                  <p>{challenge.description}</p>
                </div>
                <span className="careerDash-tag">{challenge.category}</span>
              </div>

              <div className="careerDash-why">
                <strong>{t('why_it_matters')}</strong>
                <span>{challenge.why}</span>
              </div>

              {openChallenge && (
                <div className="careerDash-challengeBody">
                  <p>{challenge.task}</p>

                  <div className="careerDash-examples">
                    <div>
                      <span>{t('before')}</span>
                      <p>{challenge.exampleBefore}</p>
                    </div>
                    <div>
                      <span>{t('after')}</span>
                      <p>{challenge.exampleAfter}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="careerDash-cardActions">
                <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setOpenChallenge(value => !value)}>
                  {openChallenge ? t('hide_example') : t('show_example')}
                </button>

                <button
                  type="button"
                  className="careerDash-btn careerDash-btnPrimary"
                  onClick={daily.completeChallenge}
                  disabled={daily.completedToday}
                >
                  {daily.completedToday ? t('completed_today') : t('mark_complete')}
                </button>
              </div>
            </article>

            <article className="careerDash-card">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">{t('guided_career_paths')}</p>
                  <h2>{t('choose_next_move')}</h2>
                </div>
              </div>

              <div className="careerDash-pathGrid">
                <PathCard icon="CV" title={t('improve_my_cv')} text={t('improve_my_cv_text')} progress={42} onClick={() => setPage?.('coach')} />
                <PathCard icon="INT" title={t('prepare_interviews')} text={t('prepare_interviews_text')} progress={18} onClick={() => setPage?.('coach')} />
                <PathCard icon="JOB" title={t('apply_smarter')} text={t('apply_smarter_text')} progress={56} onClick={() => setPage?.('analyzer')} />
                <PathCard icon="in" title="Optimize LinkedIn" text="Turn your profile into a recruiter-ready page aligned with your target role." progress={24} onClick={() => setPage?.('linkedin')} />
              </div>
            </article>

            <article className="careerDash-card">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">{t('recent_activity')}</p>
                  <h2>{t('your_latest_analyses')}</h2>
                </div>
                <button type="button" className="careerDash-linkBtn" onClick={() => setPage?.('history')}>
                  {t('view_history')}
                </button>
              </div>

              {recent.length ? (
                <div className="careerDash-recentList">
                  {recent.map((item, index) => {
                    const score = extractScore(item)
                    const title = item?.jobTitle || item?.title || item?.role || item?.result?.job_context?.title || `${t('analyze')} ${index + 1}`
                    const company = item?.company || item?.result?.job_context?.company || t('recent_jobs')

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
                  <p>{t('no_analyses_desc')}</p>
                  <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>
                    {t('run_first_check')}
                  </button>
                </div>
              )}
            </article>
          </div>

          <aside className="careerDash-side">
            <UsageLimitCard usage={usage} />

            <article className="careerDash-card careerDash-sideCard">
              <p className="careerDash-kicker">{t('weekly_goal')}</p>
              <div className="careerDash-weeklyTop">
                <strong>{metrics.weeklyCompleted || 0}/{metrics.weeklyTarget || 5}</strong>
                <span>{weeklyPercent}%</span>
              </div>
              <ProgressLine value={weeklyPercent} />
              <p>{t('complete_five_actions')}</p>
            </article>

            <article className="careerDash-card careerDash-sideCard">
              <p className="careerDash-kicker">{t('momentum')}</p>
              <div className="careerDash-momentum">
                <div>
                  <strong>{metrics.currentStreak || 0}</strong>
                  <span>{t('current_streak')}</span>
                </div>
                <div>
                  <strong>{metrics.bestStreak || 0}</strong>
                  <span>{t('best_streak')}</span>
                </div>
              </div>
            </article>

            <article className="careerDash-card careerDash-sideCard careerDash-coachCard">
              <p className="careerDash-kicker">{t('coach_insight')}</p>
              <h3>{t('measurable_achievements_title')}</h3>
              <p>{t('measurable_achievements_text')}</p>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('coach')}>
                {t('improve_my_cv')}
              </button>
            </article>
          </aside>
        </section>
      </main>
    </div>
  )
}
