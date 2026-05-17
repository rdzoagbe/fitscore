import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDailyChallenge } from '../hooks/useDailyChallenge'
import { useProgressMetrics } from '../hooks/useProgressMetrics'
import { extractScore, getUserDisplayName } from '../utils/progressUtils'
import { getMatchedJobs } from '../utils/jobMatchUtils'
import './CareerDashboardPage.css'

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
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

function MatchedJobCard({ job, onAnalyze }) {
  return (
    <article className="careerDash-matchCard">
      <div className="careerDash-matchTop">
        <div>
          <p>{job.category}</p>
          <h3>{job.title}</h3>
          <span>{job.level}</span>
        </div>
        <strong>{job.score}%</strong>
      </div>

      <p className="careerDash-matchReason">{job.reasons[0]}</p>

      <div className="careerDash-matchKeywords">
        {(job.matchedKeywords.length ? job.matchedKeywords : job.keywords.slice(0, 4)).map(keyword => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>

      <div className="careerDash-matchActions">
        <a href={job.searchUrl} target="_blank" rel="noreferrer">Find roles</a>
        <button type="button" onClick={onAnalyze}>Analyze a job</button>
      </div>
    </article>
  )
}

export default function CareerDashboardPage({ setPage }) {
  const { user } = useAuth()
  const { challenge, progress, completedToday, completeChallenge } = useDailyChallenge()
  const metrics = useProgressMetrics(progress)
  const [openChallenge, setOpenChallenge] = useState(true)

  const name = getUserDisplayName(user)
  const greeting = getTimeGreeting()
  const weeklyPercent = Math.round(((metrics.weeklyCompleted || 0) / (metrics.weeklyTarget || 5)) * 100)
  const recent = metrics.analyses.slice(0, 4)
  const matchedJobs = getMatchedJobs(metrics.analyses)
  const matchSourceLabel = matchedJobs[0]?.isProfileBased ? 'Based on your saved analyses' : 'Starter recommendations'

  return (
    <div className="careerDash-page">
      <div className="careerDash-bg careerDash-bgOne" />
      <div className="careerDash-bg careerDash-bgTwo" />

      <main className="careerDash-shell">
        <section className="careerDash-hero">
          <div className="careerDash-heroText">
            <div className="careerDash-pill">
              <span /> Career growth dashboard
            </div>

            <h1>
              {greeting}, <br />
              <em>{name}</em>
            </h1>

            <p>
              Your personal workspace to improve your CV, prepare stronger interviews,
              track progress, and build a daily job-search rhythm.
            </p>

            <div className="careerDash-actions">
              <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>
                Run ATS Check
              </button>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('coach')}>
                Open CV Coach
              </button>
            </div>
          </div>

          <aside className="careerDash-heroPanel">
            <div className="careerDash-scoreCircle">
              <span>{metrics.bestScore || 0}</span>
              <small>best score</small>
            </div>

            <div>
              <p className="careerDash-panelLabel">Next recommended action</p>
              <h2>Complete today’s challenge</h2>
              <p>
                Small daily improvements compound into a stronger profile and better applications.
              </p>
            </div>
          </aside>
        </section>

        <section className="careerDash-stats">
          <ScoreCard label="ATS checks" value={metrics.analysesCount || 0} helper="total analyses" />
          <ScoreCard label="Average score" value={metrics.averageScore ? `${metrics.averageScore}%` : '—'} helper="across checks" />
          <ScoreCard label="Best score" value={metrics.bestScore ? `${metrics.bestScore}%` : '—'} helper="highest match" tone="accent" />
          <ScoreCard label="Current streak" value={`${metrics.currentStreak || 0}d`} helper="career actions" tone="warm" />
        </section>

        <section className="careerDash-card careerDash-matchedJobs">
          <div className="careerDash-cardHeader">
            <div>
              <p className="careerDash-kicker">Matched jobs · {matchSourceLabel}</p>
              <h2>Roles aligned to your profile</h2>
              <p>Use these role targets to discover opportunities, then run an ATS check before applying.</p>
            </div>
            <button type="button" className="careerDash-linkBtn" onClick={() => setPage?.('analyzer')}>
              Analyze job
            </button>
          </div>

          <div className="careerDash-matchGrid">
            {matchedJobs.map(job => (
              <MatchedJobCard key={job.title} job={job} onAnalyze={() => setPage?.('analyzer')} />
            ))}
          </div>
        </section>

        <section className="careerDash-grid">
          <div className="careerDash-main">
            <article className="careerDash-card careerDash-challenge">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">Today’s challenge · {challenge.estimatedMinutes} min</p>
                  <h2>{challenge.title}</h2>
                  <p>{challenge.description}</p>
                </div>
                <span className="careerDash-tag">{challenge.category}</span>
              </div>

              <div className="careerDash-why">
                <strong>Why it matters</strong>
                <span>{challenge.why}</span>
              </div>

              {openChallenge && (
                <div className="careerDash-challengeBody">
                  <p>{challenge.task}</p>

                  <div className="careerDash-examples">
                    <div>
                      <span>Before</span>
                      <p>{challenge.exampleBefore}</p>
                    </div>
                    <div>
                      <span>After</span>
                      <p>{challenge.exampleAfter}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="careerDash-cardActions">
                <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setOpenChallenge(value => !value)}>
                  {openChallenge ? 'Hide example' : 'Show example'}
                </button>

                <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={completeChallenge} disabled={completedToday}>
                  {completedToday ? 'Completed today ✓' : 'Mark as complete'}
                </button>
              </div>
            </article>

            <article className="careerDash-card">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">Guided career paths</p>
                  <h2>Choose your next move</h2>
                </div>
              </div>

              <div className="careerDash-pathGrid">
                <PathCard icon="CV" title="Improve my CV" text="Fix ATS blockers, sharpen your summary, and rewrite weak bullets." progress={42} onClick={() => setPage?.('coach')} />
                <PathCard icon="INT" title="Prepare interviews" text="Build your pitch, STAR examples, and confident answers." progress={18} onClick={() => setPage?.('coach')} />
                <PathCard icon="JOB" title="Apply smarter" text="Match keywords, target better jobs, and track applications." progress={56} onClick={() => setPage?.('analyzer')} />
              </div>
            </article>

            <article className="careerDash-card">
              <div className="careerDash-cardHeader">
                <div>
                  <p className="careerDash-kicker">Recent activity</p>
                  <h2>Your latest analyses</h2>
                </div>
                <button type="button" className="careerDash-linkBtn" onClick={() => setPage?.('history')}>
                  View history
                </button>
              </div>

              {recent.length ? (
                <div className="careerDash-recentList">
                  {recent.map((item, index) => {
                    const score = extractScore(item)
                    const title = item?.jobTitle || item?.title || item?.role || item?.result?.job_context?.title || `Analysis ${index + 1}`
                    const company = item?.company || item?.result?.job_context?.company || 'Recent check'

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
                  <h3>No analyses yet</h3>
                  <p>Run your first ATS check to start building your score history.</p>
                  <button type="button" className="careerDash-btn careerDash-btnPrimary" onClick={() => setPage?.('analyzer')}>
                    Run first check
                  </button>
                </div>
              )}
            </article>
          </div>

          <aside className="careerDash-side">
            <article className="careerDash-card careerDash-sideCard">
              <p className="careerDash-kicker">Weekly goal</p>
              <div className="careerDash-weeklyTop">
                <strong>{metrics.weeklyCompleted || 0}/{metrics.weeklyTarget || 5}</strong>
                <span>{weeklyPercent}%</span>
              </div>
              <ProgressLine value={weeklyPercent} />
              <p>Complete five meaningful career actions this week.</p>
            </article>

            <article className="careerDash-card careerDash-sideCard">
              <p className="careerDash-kicker">Momentum</p>
              <div className="careerDash-momentum">
                <div>
                  <strong>{metrics.currentStreak || 0}</strong>
                  <span>current streak</span>
                </div>
                <div>
                  <strong>{metrics.bestStreak || 0}</strong>
                  <span>best streak</span>
                </div>
              </div>
            </article>

            <article className="careerDash-card careerDash-sideCard careerDash-coachCard">
              <p className="careerDash-kicker">LinkedIn profile import</p>
              <h3>Coming next: profile enrichment.</h3>
              <p>
                The safest first version will let users upload a LinkedIn profile PDF or paste their LinkedIn About/Experience text, then use it to improve job matching.
              </p>
              <button type="button" className="careerDash-btn careerDash-btnGhost" onClick={() => setPage?.('coach')}>
                Improve my profile
              </button>
            </article>
          </aside>
        </section>
      </main>
    </div>
  )
}
