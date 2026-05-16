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

const premium = {
  ivory: '#FAF7F1',
  paper: '#FFFDF8',
  navy: '#10182B',
  muted: '#5F6472',
  line: 'rgba(16,24,43,0.12)',
  copper: '#B5663C',
  copperSoft: 'rgba(181,102,60,0.10)',
  green: '#557C64',
  red: '#B85C55',
  gold: '#B9863B',
  blue: '#516483'
}

const Tag = ({ label, type }) => {
  const styles = {
    found:   { bg: 'rgba(85,124,100,0.12)',  color: premium.green, border: 'rgba(85,124,100,0.24)' },
    missing: { bg: 'rgba(184,92,85,0.10)',  color: premium.red, border: 'rgba(184,92,85,0.22)' },
    nice:    { bg: 'rgba(185,134,59,0.10)', color: premium.gold, border: 'rgba(185,134,59,0.22)' },
  }
  const s = styles[type] || styles.found
  return <span style={{ fontSize: 11, padding: '4px 9px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'inline-block', margin: '2px 2px 2px 0', fontWeight: 750 }}>{label}</span>
}

const MiniCard = ({ title, children, accent }) => (
  <div style={{ background: premium.paper, border: `1px solid ${accent ? `${accent}33` : premium.line}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 14px 38px rgba(16,24,43,0.06)' }}>
    <div style={{ padding: '14px 16px 0' }}>
      <span style={{ fontSize: 10, fontWeight: 900, color: accent || premium.copper, letterSpacing: '0.10em', textTransform: 'uppercase' }}>{title}</span>
    </div>
    <div style={{ padding: '9px 16px 16px' }}>{children}</div>
  </div>
)

export default function ResultsView({ data, savedRow: serverSavedRow, rateLimit, onReset, onGoCoach }) {
  const { user } = useAuth()
  const { t } = useLang()
  const km = data.keyword_match || {}
  const req = data.requirements_check || {}
  const score = data.display_score ?? 0
  const jobUrl = data.job_url || null
  const [analysisRow, setAnalysisRow] = useState(() => {
    if (serverSavedRow) return serverSavedRow
    if (data.id) return data
    return null
  })
  const autoSaveStatus = analysisRow ? 'saved' : 'idle'
  const scoreDelta = useScoreDelta(analysisRow || data)

  useEffect(() => {
    if (serverSavedRow && (!analysisRow || analysisRow.id !== serverSavedRow.id)) {
      setAnalysisRow(serverSavedRow)
    }
  }, [serverSavedRow])

  const handleStatusUpdate = (updated) => setAnalysisRow(updated)

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      <div style={{ marginBottom: 20, padding: '22px 24px', borderRadius: 28, background: premium.paper, border: `1px solid ${premium.line}`, boxShadow: '0 20px 55px rgba(16,24,43,0.07)' }}>
        <p style={{ margin: 0, color: premium.copper, fontSize: 11, fontWeight: 950, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Analysis report</p>
        <h2 style={{ margin: '8px 0 0', color: premium.navy, fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(34px,5vw,56px)', lineHeight: 0.96, letterSpacing: '-0.07em', fontWeight: 500 }}>Your application fit</h2>
        <p style={{ maxWidth: 720, margin: '12px 0 0', color: premium.muted, fontSize: 14, lineHeight: 1.7 }}>
          Review the score, missing keywords, quick wins, and next steps before you send this application.
        </p>
      </div>

      <WaitlistBanner rateLimit={rateLimit} />
      <CvPreview preview={data.cv_preview} truncated={data.cv_preview_truncated} />

      <JobContextCard
        context={data.job_context}
        summary={data.job_summary}
        jobUrl={jobUrl}
        redFlags={data.red_flags}
        salary={data.salary_assessment}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {autoSaveStatus === 'saving' && (
            <span style={{ fontSize: 11, color: premium.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, border: `1.5px solid ${premium.line}`, borderTop: `1.5px solid ${premium.muted}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              {t('auto_saving') || 'saving...'}
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span style={{ fontSize: 11, color: premium.muted, fontWeight: 800 }}>✓ {t('saved_to_history') || 'Saved'}</span>
          )}
          {autoSaveStatus === 'saved' && analysisRow && (
            <StatusPill analysis={analysisRow} onUpdate={handleStatusUpdate} compact />
          )}
        </div>

        <button onClick={onReset} style={{
          background: premium.paper, border: `1px solid ${premium.line}`,
          borderRadius: 20, padding: '7px 15px', cursor: 'pointer',
          color: premium.muted, fontSize: 12, fontWeight: 800,
          fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s', whiteSpace: 'nowrap'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = premium.copper; e.currentTarget.style.color = premium.copper }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = premium.line; e.currentTarget.style.color = premium.muted }}
        >
          ↻ {t('run_another') || 'Run another'}
        </button>
      </div>

      <FitScoreCard data={data} scoreDelta={scoreDelta} />

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

      <div className="mini-cards" style={{ marginBottom: 14 }}>
        <MiniCard title={t('score_breakdown')} accent={premium.blue}>
          {[[t('keywords_60'), km.score??0, premium.blue], [t('requirements_40'), req.score??0, premium.green]].map(([label, val, color]) => (
            <div key={label} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: premium.muted }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color }}>{val}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(16,24,43,0.10)', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 999, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </MiniCard>

        <MiniCard title={`${t('gaps')}${data.critical_gaps?.length ? ` (${data.critical_gaps.length})` : ''}`} accent={premium.red}>
          {data.critical_gaps?.length > 0 ? data.critical_gaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
              <span style={{ color: premium.red, flexShrink: 0, fontSize: 11 }}>✗</span>
              <p style={{ fontSize: 11, color: premium.muted, lineHeight: 1.5, margin: 0 }}>{g}</p>
            </div>
          )) : <p style={{ fontSize: 11, color: premium.green, marginTop: 4 }}>{t('no_critical_gaps')}</p>}
        </MiniCard>

        <MiniCard title={t('keywords')} accent={premium.copper}>
          {km.found?.length > 0 && <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 10, color: premium.green, marginBottom: 4, fontWeight: 800 }}>{t('found')}</p>
            {km.found.slice(0,6).map(k => <Tag key={k} label={k} type="found" />)}
          </div>}
          {km.missing_required?.length > 0 && <div style={{ marginBottom: 6 }}>
            <p style={{ fontSize: 10, color: premium.red, marginBottom: 4, fontWeight: 800 }}>{t('missing')}</p>
            {km.missing_required.slice(0,5).map(k => <Tag key={k} label={k} type="missing" />)}
          </div>}
          {km.missing_nice?.length > 0 && <div>
            <p style={{ fontSize: 10, color: premium.gold, marginBottom: 4, fontWeight: 800 }}>{t('nice_to_have')}</p>
            {km.missing_nice.slice(0,3).map(k => <Tag key={k} label={k} type="nice" />)}
          </div>}
        </MiniCard>

        <MiniCard title={t('requirements')} accent={premium.gold}>
          {req.met?.length > 0 && <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 10, color: premium.green, marginBottom: 4, fontWeight: 800 }}>{t('met')}</p>
            {req.met.slice(0,3).map((r,i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <span style={{ color: premium.green, fontSize: 11, flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 11, color: premium.muted, margin: 0, lineHeight: 1.4 }}>{r}</p>
              </div>
            ))}
          </div>}
          {req.unmet?.length > 0 && <div>
            <p style={{ fontSize: 10, color: premium.red, marginBottom: 4, fontWeight: 800 }}>{t('unmet')}</p>
            {req.unmet.slice(0,3).map((r,i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <span style={{ color: premium.red, fontSize: 11, flexShrink: 0 }}>✗</span>
                <p style={{ fontSize: 11, color: premium.muted, margin: 0, lineHeight: 1.4 }}>{r}</p>
              </div>
            ))}
          </div>}
        </MiniCard>
      </div>

      <QuickWinsCard wins={data.quick_wins} />
      {onGoCoach && <CvCoachPreview data={data} onGoCoach={onGoCoach} />}

      {data.format_warnings?.filter(w => w?.length > 5).length > 0 && (
        <div style={{ background: 'rgba(185,134,59,0.08)', border: '1px solid rgba(185,134,59,0.22)', borderRadius: 18, padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: premium.gold, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>{t('format_warnings')}</p>
          {data.format_warnings.filter(w => w?.length > 5).map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: premium.gold, flexShrink: 0 }}>⚠</span>
              <p style={{ fontSize: 12, color: premium.muted, lineHeight: 1.5, margin: 0 }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      <SmartApplyBtn context={data.job_context} jobUrl={jobUrl} verdict={data.overall_verdict} />

      <div className="btn-row">
        <button onClick={onReset} className="btn-primary" style={{ width: '100%', background: premium.navy, color: premium.ivory }}>↻ {t('run_another') || 'Run another'}</button>
        {onGoCoach && (
          <button onClick={onGoCoach} style={{ padding: '14px', borderRadius: 14, background: premium.paper, color: premium.muted, border: `1px solid ${premium.line}`, fontFamily: 'Georgia, Newsreader, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            🎤 {t('nav_coach') || 'CV Coach'}
          </button>
        )}
      </div>
    </div>
  )
}
