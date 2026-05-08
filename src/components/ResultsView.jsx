import React, { useState, useEffect } from 'react'
import JobContextCard from './JobContextCard'
import FitScoreCard from './FitScoreCard'
import NextStepsCard from './NextStepsCard'
import SalaryInsightCard from './SalaryInsightCard'
import { useScoreDelta } from '../hooks/useScoreDelta'
import SeniorityCard from './SeniorityCard'
import SmartApplyBtn from './SmartApplyBtn'
import InterviewPrepCard from './InterviewPrepCard'
import QuickWinsCard from './QuickWinsCard'
import CvCoachPreview from './CvCoachPreview'
import CvPreview from './CvPreview'
import StatusPill from './StatusPill'
import WaitlistBanner from './WaitlistBanner'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { trackEvent } from '../utils/analytics'
import './ResultsView.css'

const verdictCopy = {
  likely_passed: { label: 'Strong match', tone: 'good', icon: '✓' },
  borderline: { label: 'Possible match', tone: 'mid', icon: '!' },
  likely_filtered: { label: 'Needs work', tone: 'bad', icon: '×' }
}

function scoreTone(score) {
  if (score >= 70) return 'good'
  if (score >= 50) return 'mid'
  return 'bad'
}

function Tag({ label, type }) {
  return <span className={`resultsPro-tag resultsPro-tag--${type || 'found'}`}>{label}</span>
}

function MetricCard({ label, value, sub, tone }) {
  return (
    <div className="resultsPro-metric">
      <p>{label}</p>
      <strong className={tone ? `is-${tone}` : ''}>{value}</strong>
      {sub && <span>{sub}</span>}
    </div>
  )
}

function ProgressLine({ label, value, tone }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="resultsPro-progressLine">
      <div>
        <span>{label}</span>
        <strong className={`is-${tone}`}>{safe}%</strong>
      </div>
      <em><i className={`is-${tone}`} style={{ width: `${safe}%` }} /></em>
    </div>
  )
}

function InsightList({ title, items, empty, tone, icon }) {
  return (
    <section className={`resultsPro-insight resultsPro-insight--${tone || 'neutral'}`}>
      <div className="resultsPro-insightHead">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>
      {items?.length ? (
        <div className="resultsPro-list">
          {items.map((item, index) => (
            <p key={index}>{typeof item === 'string' ? item : item?.area ? `${item.area}: ${item.prep_tip || ''}` : JSON.stringify(item)}</p>
          ))}
        </div>
      ) : (
        <p className="resultsPro-emptyText">{empty}</p>
      )}
    </section>
  )
}

export default function ResultsView({ data, savedRow: serverSavedRow, rateLimit, onReset, onGoCoach }) {
  const { user } = useAuth()
  const { t } = useLang()
  const km = data.keyword_match || {}
  const req = data.requirements_check || {}
  const score = data.display_score ?? 0
  const tone = scoreTone(score)
  const jobUrl = data.job_url || null
  const verdict = verdictCopy[data.overall_verdict] || verdictCopy.borderline

  const [analysisRow, setAnalysisRow] = useState(() => {
    if (serverSavedRow) return serverSavedRow
    if (data.id) return data
    return null
  })

  const autoSaveStatus = analysisRow ? 'saved' : 'idle'
  const scoreDelta = useScoreDelta(analysisRow || data)

  useEffect(() => {
    trackEvent('results_viewed', {
      score,
      verdict: data.overall_verdict || null,
      has_salary: !!data.salary_intelligence,
      has_interview_prep: !!data.interview_prep?.show_prep
    })
  }, [])

  useEffect(() => {
    if (serverSavedRow && (!analysisRow || analysisRow.id !== serverSavedRow.id)) {
      setAnalysisRow(serverSavedRow)
    }
  }, [serverSavedRow])

  const handleStatusUpdate = (updated) => {
    setAnalysisRow(updated)
    trackEvent('application_status_changed', { status: updated?.application_status || null })
  }

  const found = km.found || []
  const missingRequired = km.missing_required || []
  const missingNice = km.missing_nice || []
  const criticalGaps = data.critical_gaps || []
  const met = req.met || []
  const unmet = req.unmet || []

  return (
    <div className="resultsPro-page page-enter">
      <WaitlistBanner rateLimit={rateLimit} />

      <section className="resultsPro-hero">
        <div className="resultsPro-heroMain">
          <p className="resultsPro-kicker">{t('results') || 'Results'}</p>
          <h1>{verdict.label}</h1>
          <p>{data.overall_reason || data.match_reasoning || 'Here is how your CV compares to this role.'}</p>

          <div className="resultsPro-actions">
            <button className="resultsPro-primaryBtn" onClick={onGoCoach} disabled={!onGoCoach}>
              🎤 {t('nav_coach') || 'Improve with CV Coach'}
            </button>
            <button className="resultsPro-secondaryBtn" onClick={onReset}>
              ↻ {t('run_another') || 'Run another'}
            </button>
          </div>
        </div>

        <aside className={`resultsPro-scorePanel is-${tone}`}>
          <div className="resultsPro-scoreOrb">
            <strong>{score}%</strong>
            <span>{t('match_score') || 'Match score'}</span>
          </div>
          <div>
            <p>{verdict.icon} {data.verdict || verdict.label}</p>
            <h2>{data.job_context?.title || data.job_title || 'Job analysis'}</h2>
            <span>{data.job_context?.company && data.job_context.company !== 'Not specified' ? data.job_context.company : 'Company not specified'}</span>
          </div>
        </aside>
      </section>

      <div className="resultsPro-statusBar">
        <div>
          {autoSaveStatus === 'saved' && <span className="resultsPro-saveState">✓ {t('saved_to_history') || 'Saved to History'}</span>}
          {autoSaveStatus === 'saved' && analysisRow && <StatusPill analysis={analysisRow} onUpdate={handleStatusUpdate} compact />}
        </div>
        <button onClick={onReset}>↻ {t('run_another') || 'Run another'}</button>
      </div>

      <section className="resultsPro-metrics">
        <MetricCard label={t('keywords') || 'Keywords'} value={`${km.score ?? 0}%`} sub={t('keywords_60') || '60% of score'} tone={scoreTone(km.score ?? 0)} />
        <MetricCard label={t('requirements') || 'Requirements'} value={`${req.score ?? 0}%`} sub={t('requirements_40') || '40% of score'} tone={scoreTone(req.score ?? 0)} />
        <MetricCard label={t('match_probability') || 'Probability'} value={`${data.match_probability ?? score}%`} sub={data.seniority?.alignment_label || 'Fit estimate'} tone={scoreTone(data.match_probability ?? score)} />
        <MetricCard label={t('gaps') || 'Gaps'} value={criticalGaps.length} sub={criticalGaps.length ? 'Needs attention' : 'No critical gap'} tone={criticalGaps.length ? 'bad' : 'good'} />
      </section>

      <section className="resultsPro-workspace">
        <main className="resultsPro-mainColumn">
          <div className="resultsPro-card resultsPro-card--score">
            <div className="resultsPro-sectionHead">
              <p className="resultsPro-kicker">{t('score_breakdown') || 'Score breakdown'}</p>
              <h2>{t('ats_score_detail') || 'Why this score?'}</h2>
            </div>
            <div className="resultsPro-progressStack">
              <ProgressLine label={t('keywords_60') || 'Keywords'} value={km.score ?? 0} tone={scoreTone(km.score ?? 0)} />
              <ProgressLine label={t('requirements_40') || 'Requirements'} value={req.score ?? 0} tone={scoreTone(req.score ?? 0)} />
            </div>
            <FitScoreCard data={data} scoreDelta={scoreDelta} />
          </div>

          <div className="resultsPro-gridTwo">
            <InsightList
              title={t('critical_gaps') || 'Critical gaps'}
              icon="⚠"
              tone={criticalGaps.length ? 'danger' : 'success'}
              items={criticalGaps}
              empty={t('no_critical_gaps') || 'No critical gaps detected.'}
            />
            <InsightList
              title={t('requirements') || 'Requirements'}
              icon="📋"
              tone="neutral"
              items={[...met.slice(0, 3).map(x => `✓ ${x}`), ...unmet.slice(0, 3).map(x => `✗ ${x}`)]}
              empty="No specific requirements were extracted."
            />
          </div>

          <section className="resultsPro-card">
            <div className="resultsPro-sectionHead">
              <p className="resultsPro-kicker">{t('keywords') || 'Keywords'}</p>
              <h2>{t('keyword_match') || 'Keyword match'}</h2>
            </div>
            <div className="resultsPro-keywordBlocks">
              <div>
                <h3>{t('found') || 'Found'}</h3>
                <div>{found.length ? found.slice(0, 10).map(k => <Tag key={k} label={k} type="found" />) : <p className="resultsPro-emptyText">No strong keyword matches found.</p>}</div>
              </div>
              <div>
                <h3>{t('missing') || 'Missing required'}</h3>
                <div>{missingRequired.length ? missingRequired.slice(0, 8).map(k => <Tag key={k} label={k} type="missing" />) : <p className="resultsPro-emptyText">No required keyword gap detected.</p>}</div>
              </div>
              <div>
                <h3>{t('nice_to_have') || 'Nice to have'}</h3>
                <div>{missingNice.length ? missingNice.slice(0, 6).map(k => <Tag key={k} label={k} type="nice" />) : <p className="resultsPro-emptyText">No optional keyword gap detected.</p>}</div>
              </div>
            </div>
          </section>

          <QuickWinsCard wins={data.quick_wins} />
          {onGoCoach && <CvCoachPreview data={data} onGoCoach={onGoCoach} />}

          {data.format_warnings?.filter(w => w?.length > 5).length > 0 && (
            <section className="resultsPro-card resultsPro-warningBox">
              <p className="resultsPro-kicker">{t('format_warnings') || 'Format warnings'}</p>
              {data.format_warnings.filter(w => w?.length > 5).map((warning, index) => (
                <p key={index}>⚠ {warning}</p>
              ))}
            </section>
          )}
        </main>

        <aside className="resultsPro-sideColumn">
          <NextStepsCard
            score={score}
            onGoCoach={onGoCoach}
            onReset={onReset}
            jobUrl={jobUrl}
            easyApply={data.job_context?.easy_apply}
          />
          <SalaryInsightCard data={data} />
          <SeniorityCard seniority={data.seniority} />
          <InterviewPrepCard prep={data.interview_prep} score={score} />
        </aside>
      </section>

      <section className="resultsPro-contextGrid">
        <div className="resultsPro-card">
          <CvPreview preview={data.cv_preview} truncated={data.cv_preview_truncated} />
        </div>
        <div className="resultsPro-card">
          <JobContextCard
            context={data.job_context}
            summary={data.job_summary}
            jobUrl={jobUrl}
            redFlags={data.red_flags}
            salary={data.salary_assessment}
          />
        </div>
      </section>

      <SmartApplyBtn context={data.job_context} jobUrl={jobUrl} verdict={data.overall_verdict} />

      <div className="resultsPro-bottomActions">
        <button onClick={onReset} className="resultsPro-primaryBtn">↻ {t('run_another') || 'Run another'}</button>
        {onGoCoach && <button onClick={onGoCoach} className="resultsPro-secondaryBtn">🎤 {t('nav_coach') || 'CV Coach'}</button>}
      </div>
    </div>
  )
}
