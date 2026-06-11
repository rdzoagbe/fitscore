import React, { useState, useEffect } from 'react'
import NextStepsCard from './NextStepsCard'
import SalaryInsightCard from './SalaryInsightCard'
import SeniorityCard from './SeniorityCard'
import SmartApplyBtn from './SmartApplyBtn'
import InterviewPrepCard from './InterviewPrepCard'
import CvCoachPreview from './CvCoachPreview'
import CvBuilderCard from './CvBuilderCard'
import StatusPill from './StatusPill'
import WaitlistBanner from './WaitlistBanner'
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
  blue: '#516483',
  purple: '#7B61B8'
}

function safeArray(value, limit = 8) {
  return Array.isArray(value) ? value.filter(Boolean).slice(0, limit) : []
}

function unique(items = [], limit = 8) {
  return [...new Set(items.filter(Boolean).map(item => String(item).trim()).filter(Boolean))].slice(0, limit)
}

function safeScore(value, fallback = 0) {
  const n = typeof value === 'number' ? value : parseInt(value, 10)
  if (Number.isNaN(n)) return fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function scoreLabel(score, verdict) {
  if (verdict) return String(verdict).replace(/_/g, ' ').toUpperCase()
  if (score >= 75) return 'LIKELY PASSED'
  if (score >= 55) return 'BORDERLINE'
  return 'NEEDS WORK'
}

function formatDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  } catch {
    return ''
  }
}

function scoreTone(score) {
  if (score >= 75) return premium.green
  if (score >= 55) return premium.gold
  return premium.red
}

function Tag({ label, type = 'found' }) {
  const styles = {
    found: { bg: 'rgba(85,124,100,0.12)', color: premium.green, border: 'rgba(85,124,100,0.24)' },
    missing: { bg: 'rgba(184,92,85,0.10)', color: premium.red, border: 'rgba(184,92,85,0.22)' },
    neutral: { bg: 'rgba(181,102,60,0.09)', color: premium.copper, border: 'rgba(181,102,60,0.20)' }
  }
  const s = styles[type] || styles.found
  return <span style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'inline-block', margin: '3px 4px 3px 0', fontWeight: 850 }}>{label}</span>
}

function InfoPill({ label, value }) {
  return (
    <div style={{ border: `1px solid ${premium.line}`, borderRadius: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.52)', minHeight: 50 }}>
      <p style={{ margin: '0 0 6px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: premium.copper, fontWeight: 950 }}>{label}</p>
      <strong style={{ display: 'block', color: premium.navy, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || 'Not stated'}</strong>
    </div>
  )
}

function BulletList({ items, tone = 'good', empty, max = 5 }) {
  const color = tone === 'bad' ? premium.red : premium.green
  return items?.length ? (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.slice(0, max).map((item, index) => (
        <div key={`${item}-${index}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <span style={{ color, fontSize: 16, lineHeight: '14px' }}>•</span>
          <p style={{ margin: 0, color: premium.muted, fontSize: 12, lineHeight: 1.45 }}>{item}</p>
        </div>
      ))}
    </div>
  ) : <p style={{ margin: 0, color: tone === 'bad' ? premium.green : premium.muted, fontSize: 12, lineHeight: 1.5 }}>{empty}</p>
}

function SummaryCard({ title, children }) {
  return (
    <section style={{ border: `1px solid ${premium.line}`, borderRadius: 20, padding: 16, background: premium.paper, minHeight: 132 }}>
      <h3 style={{ margin: '0 0 14px', color: premium.navy, fontSize: 14, fontWeight: 950 }}>{title}</h3>
      {children}
    </section>
  )
}

function ScoreBreakdownCard({ label, score, helper, color }) {
  const s = safeScore(score, 0)
  const tone = color || scoreTone(s)
  return (
    <article style={{ border: `1px solid ${premium.line}`, borderRadius: 18, padding: 15, background: 'rgba(255,255,255,0.54)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', border: `6px solid ${tone}`, background: 'rgba(255,255,255,0.6)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <strong style={{ color: tone, fontSize: 15 }}>{s}%</strong>
        </div>
        <div style={{ minWidth: 0 }}>
          <h4 style={{ margin: '0 0 5px', color: premium.navy, fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h4>
          <p style={{ margin: 0, color: premium.muted, fontSize: 12, lineHeight: 1.45 }}>{helper}</p>
        </div>
      </div>
    </article>
  )
}

function LanguageMismatchBanner({ languageCheck }) {
  if (!languageCheck?.mismatch) return null
  const jobLabel = languageCheck.job?.label
  const cvLabel = languageCheck.cv?.label
  if (!jobLabel || !cvLabel) return null

  return (
    <div style={{ background: 'rgba(185,134,59,0.08)', border: '1px solid rgba(185,134,59,0.22)', borderRadius: 18, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10 }}>
      <span style={{ color: premium.gold, flexShrink: 0 }}>⚠</span>
      <div>
        <p style={{ fontSize: 10, fontWeight: 900, color: premium.gold, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Language mismatch detected</p>
        <p style={{ fontSize: 12, color: premium.muted, lineHeight: 1.5, margin: 0 }}>
          This job offer looks like it's written in {jobLabel}, but your CV looks like it's in {cvLabel}. Keyword matching is language-sensitive, so this score may be less accurate. For a more reliable result, try re-running the analysis with a {jobLabel} version of your CV.
        </p>
      </div>
    </div>
  )
}

function JobDetailsCard({ data }) {
  const sections = data.job_sections || {}
  const context = data.job_context || {}
  const hiringContact = context.hiring_contact && !['null', 'not mentioned', 'not stated', 'n/a'].includes(String(context.hiring_contact).toLowerCase().trim()) ? context.hiring_contact : null
  const experienceRequired = context.experience_required && !['null', 'not stated', 'not specified'].includes(String(context.experience_required).toLowerCase().trim()) ? context.experience_required : null
  const aboutCompany = sections.about_company && sections.about_company !== 'null' ? sections.about_company : null
  const aboutRole = sections.about_role && sections.about_role !== 'null' ? sections.about_role : null
  const responsibilities = safeArray(sections.key_responsibilities, 4)
  const requirements = safeArray(sections.key_requirements, 4)
  const benefits = sections.benefits && sections.benefits !== 'null' ? sections.benefits : null
  const hasAny = hiringContact || experienceRequired || aboutCompany || aboutRole || responsibilities.length || requirements.length || benefits
  if (!hasAny) return null

  return (
    <section style={{ border: `1px solid ${premium.line}`, borderRadius: 20, padding: '18px 20px', background: premium.paper, marginBottom: 16 }}>
      <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase', color: premium.copper }}>About this role</p>
      {(hiringContact || experienceRequired) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: aboutCompany || aboutRole || responsibilities.length || requirements.length ? 14 : 0 }}>
          {hiringContact && <InfoPill label="Hiring contact" value={hiringContact} />}
          {experienceRequired && <InfoPill label="Experience required" value={experienceRequired} />}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {aboutCompany && <SummaryCard title="About the company"><p style={{ margin: 0, fontSize: 12, color: premium.muted, lineHeight: 1.55 }}>{aboutCompany}</p></SummaryCard>}
        {aboutRole && <SummaryCard title="The role"><p style={{ margin: 0, fontSize: 12, color: premium.muted, lineHeight: 1.55 }}>{aboutRole}</p></SummaryCard>}
        {responsibilities.length > 0 && <SummaryCard title="Key responsibilities"><BulletList items={responsibilities} tone="good" empty="" max={4} /></SummaryCard>}
        {requirements.length > 0 && <SummaryCard title="Key requirements"><BulletList items={requirements} tone="good" empty="" max={4} /></SummaryCard>}
        {benefits && <SummaryCard title="Benefits"><p style={{ margin: 0, fontSize: 12, color: premium.muted, lineHeight: 1.55 }}>{benefits}</p></SummaryCard>}
      </div>
    </section>
  )
}

function SelectedAnalysisSummary({ data, savedRow, t }) {
  const context = data.job_context || {}
  const recruiter = data.recruiter_shortlist || {}
  const keyword = data.keyword_match || {}
  const req = data.requirements_check || {}
  const strict = data.strict_ats_result || {}
  const strictAnalysis = strict.analysis || {}
  const strictMatched = safeArray(strictAnalysis.matched_skills, 12)
  const cleanKeywords = data.keywords_analysis || {}
  const cleanReq = data.requirements_analysis || {}
  const semantic = data.semantic_fit || {}
  const seniority = data.seniority_fit || data.seniority || {}

  const score = safeScore(data.display_score ?? data.match_probability, 0)
  const tone = scoreTone(score)
  const title = context.job_title || context.title || data.job_title || t('selected_analysis_fallback_title', 'Selected analysis')
  const company = context.company && !['Not specified', 'Not stated'].includes(context.company) ? context.company : null
  const analyzedAt = formatDate(savedRow?.created_at || data.created_at)
  const subtitle = [company, analyzedAt].filter(Boolean).join(' · ')
  const summary = context.job_summary || data.job_summary || data.match_reasoning || recruiter.reason || 'Joblytics analyzed the job description against the current CV and extracted the strongest ATS signals.'

  const missingKeywords = unique([...(cleanKeywords.missing_keywords || []), ...(keyword.missing_required || []), ...(strictAnalysis.missing_skills || [])], 10)
  const foundKeywords = unique([...(cleanKeywords.found_in_cv || []), ...(keyword.found || []), ...strictMatched.map(item => item.required_skill)], 12)
  const quickWins = safeArray(data.quick_wins, 5)
  const gaps = unique([...(data.gaps_to_address || []), ...(data.critical_gaps || []), ...(cleanReq.requirements_missing || []), ...(strictAnalysis.needs_proof || [])], 6)
  const met = unique([...(cleanReq.requirements_met || []), ...(req.met || []), ...strictMatched.map(item => item.required_skill)], 6)
  const unmet = unique([...(cleanReq.requirements_missing || []), ...(req.unmet || []), ...(strictAnalysis.missing_skills || [])], 6)
  const salaryText = context.salary || context.salary_range || data.salary_assessment?.assessment || 'Not stated'
  const statusText = savedRow ? 'Saved' : 'Ready to save'
  const recruiterSummary = data.recruiter_screening_summary || recruiter.reason || data.overall_reason || 'Use this result to decide what to fix before applying.'

  const keywordScore = safeScore(keyword.score, foundKeywords.length || missingKeywords.length ? Math.round((foundKeywords.length / Math.max(1, foundKeywords.length + missingKeywords.length)) * 100) : score)
  const experienceScore = safeScore(req.score ?? data.experience_depth?.score, score)
  const semanticScore = safeScore(semantic.score, score)
  const seniorityScore = safeScore(seniority.score, score)
  const recruiterScore = safeScore(recruiter.probability, score)

  return (
    <section style={{ marginBottom: 20, padding: 24, borderRadius: 28, background: premium.paper, border: `1px solid ${premium.line}`, boxShadow: '0 24px 70px rgba(16,24,43,0.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 20, alignItems: 'start', borderBottom: `1px solid ${premium.line}`, paddingBottom: 18 }}>
        <div>
          <p style={{ margin: 0, color: premium.copper, fontSize: 10, fontWeight: 950, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{t('selected_analysis', 'Selected analysis')}</p>
          <h1 style={{ margin: '7px 0 6px', color: premium.navy, fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1, letterSpacing: '-0.055em', fontWeight: 500 }}>{title}</h1>
          {subtitle && <p style={{ margin: 0, color: premium.muted, fontSize: 12 }}>{subtitle}</p>}
        </div>
        <div style={{ width: 108, height: 108, borderRadius: '50%', border: `9px solid ${tone}`, background: score >= 75 ? 'rgba(85,124,100,0.10)' : score >= 55 ? 'rgba(185,134,59,0.10)' : 'rgba(184,92,85,0.10)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <strong style={{ display: 'block', fontFamily: 'Georgia, Newsreader, serif', color: tone, fontSize: 31, lineHeight: 1 }}>{score}%</strong>
            <span style={{ display: 'block', marginTop: 5, color: tone, fontSize: 9, fontWeight: 950, letterSpacing: '0.07em' }}>{scoreLabel(score, data.overall_verdict)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginTop: 18 }}>
        <ScoreBreakdownCard label="Keywords" score={keywordScore} helper={`${foundKeywords.length} found · ${missingKeywords.length} missing`} color={premium.gold} />
        <ScoreBreakdownCard label="Experience" score={experienceScore} helper="Relevant experience evidence" color={premium.green} />
        <ScoreBreakdownCard label="Semantic fit" score={semanticScore} helper="Role/responsibility alignment" color={premium.blue} />
        <ScoreBreakdownCard label="Seniority" score={seniorityScore} helper="Level and scope alignment" color={premium.purple} />
        <ScoreBreakdownCard label="Recruiter" score={recruiterScore} helper="Shortlist probability signal" color={tone} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 18 }}>
        <div style={{ border: `1px solid ${premium.line}`, borderRadius: 20, padding: 16, background: 'rgba(255,255,255,0.50)' }}>
          <p style={{ margin: 0, color: premium.muted, fontSize: 12, lineHeight: 1.7 }}>{summary}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
            <InfoPill label="Work mode" value={context.work_mode || 'Not stated'} />
            <InfoPill label="Contract" value={context.contract_type || 'Not stated'} />
            <InfoPill label="Salary" value={salaryText} />
            <InfoPill label="Status" value={statusText} />
          </div>
          <div style={{ marginTop: 12, padding: '13px 14px', borderRadius: 14, border: '1px solid rgba(181,102,60,0.20)', background: premium.copperSoft }}>
            <strong style={{ display: 'block', color: premium.navy, fontSize: 12, marginBottom: 5 }}>Recruiter screening summary</strong>
            <p style={{ margin: 0, color: premium.muted, fontSize: 12, lineHeight: 1.5 }}>{recruiterSummary}</p>
          </div>
        </div>

        <div style={{ border: `1px solid ${premium.line}`, borderRadius: 20, padding: 16, background: 'rgba(255,255,255,0.50)' }}>
          <h3 style={{ margin: '0 0 14px', color: premium.navy, fontSize: 14, fontWeight: 950 }}>Missing keywords</h3>
          <div style={{ minHeight: 42 }}>{missingKeywords.length ? missingKeywords.map(k => <Tag key={`missing-${k}`} label={k} type="missing" />) : <p style={{ margin: 0, color: premium.green, fontSize: 12 }}>No critical missing keywords detected.</p>}</div>
          <h3 style={{ margin: '18px 0 10px', color: premium.navy, fontSize: 14, fontWeight: 950 }}>Found in CV</h3>
          <div>{foundKeywords.length ? foundKeywords.map(k => <Tag key={`found-${k}`} label={k} type="found" />) : <p style={{ margin: 0, color: premium.muted, fontSize: 12 }}>No strong keyword evidence returned.</p>}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginTop: 14 }}>
        <SummaryCard title="Quick wins"><BulletList items={quickWins} tone="good" empty="No quick wins returned." max={4} /></SummaryCard>
        <SummaryCard title="Gaps to address"><BulletList items={gaps} tone="bad" empty="No priority gaps detected." max={4} /></SummaryCard>
        <SummaryCard title="Requirements met"><BulletList items={met} tone="good" empty="No met requirements returned." max={5} /></SummaryCard>
        <SummaryCard title="Requirements missing"><BulletList items={unmet} tone="bad" empty="No missing requirements detected." max={5} /></SummaryCard>
      </div>
    </section>
  )
}

export default function ResultsView({ data, savedRow: serverSavedRow, rateLimit, onReset, onGoCoach }) {
  const { t } = useLang()
  const score = data.display_score ?? 0
  const jobUrl = data.job_url || null
  const [analysisRow, setAnalysisRow] = useState(() => {
    if (serverSavedRow) return serverSavedRow
    if (data.id) return data
    return null
  })
  const autoSaveStatus = analysisRow ? 'saved' : 'idle'

  useEffect(() => {
    if (serverSavedRow && (!analysisRow || analysisRow.id !== serverSavedRow.id)) setAnalysisRow(serverSavedRow)
  }, [serverSavedRow, analysisRow])

  const handleStatusUpdate = updated => setAnalysisRow(updated)
  const selectedForRebuilder = analysisRow?.result ? analysisRow : { ...(analysisRow || {}), result: data, score, id: analysisRow?.id || data.id || 'current-analysis' }

  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      <SelectedAnalysisSummary data={data} savedRow={analysisRow || serverSavedRow} t={t} />
      <JobDetailsCard data={data} />
      <LanguageMismatchBanner languageCheck={data.language_check} />
      <WaitlistBanner rateLimit={rateLimit} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {autoSaveStatus === 'saved' && <span style={{ fontSize: 11, color: premium.muted, fontWeight: 800 }}>✓ {t('saved_to_history')}</span>}
          {autoSaveStatus === 'saved' && analysisRow && <StatusPill analysis={analysisRow} onUpdate={handleStatusUpdate} compact />}
        </div>
        <button onClick={onReset} style={{ background: premium.paper, border: `1px solid ${premium.line}`, borderRadius: 20, padding: '7px 15px', cursor: 'pointer', color: premium.muted, fontSize: 12, fontWeight: 800, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>↻ {t('run_another')}</button>
      </div>

      <NextStepsCard score={score} onGoCoach={onGoCoach} onReset={onReset} jobUrl={jobUrl} easyApply={data.job_context?.easy_apply} />
      <SalaryInsightCard data={data} />
      <SeniorityCard seniority={data.seniority} />
      <InterviewPrepCard prep={data.interview_prep} score={score} />

      <div style={{ marginTop: 18, marginBottom: 18 }}>
        <CvBuilderCard selected={selectedForRebuilder} />
      </div>

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
        <button onClick={onReset} className="btn-primary" style={{ width: '100%', background: premium.navy, color: premium.ivory }}>↻ {t('run_another')}</button>
        {onGoCoach && (
          <button onClick={onGoCoach} style={{ padding: 14, borderRadius: 14, background: premium.paper, color: premium.muted, border: `1px solid ${premium.line}`, fontFamily: 'Georgia, Newsreader, serif', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            🎤 {t('nav_coach')}
          </button>
        )}
      </div>
    </div>
  )
}
