import React, { useMemo, useState } from 'react'
import { useCvPersist } from '../hooks/useCvPersist'
import { useLang } from '../context/LangContext'
import { downloadCvBuilderDocx, downloadCvBuilderPdf } from '../utils/cvBuilderExports'

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeList(values = []) {
  return values
    .flat()
    .map(item => typeof item === 'string' ? item : item?.tip || item?.area || item?.prep_tip || '')
    .map(item => item.trim())
    .filter(Boolean)
}

function getJobContext(selected, jobText, jobUrl) {
  const result = selected?.result || {}
  const ctx = result.job_context || {}
  const missingRequired = normalizeList(result.keyword_match?.missing_required)
  const missingNice = normalizeList(result.keyword_match?.missing_nice)
  const foundKeywords = normalizeList(result.keyword_match?.found || result.keyword_match?.matched)
  const unmet = normalizeList(result.requirements_check?.unmet)
  const met = normalizeList(result.requirements_check?.met)
  const quickWins = normalizeList(result.quick_wins)
  const edges = normalizeList(result.interview_prep?.your_edges)

  return {
    title: safeText(ctx.title, 'Target role'),
    company: safeText(ctx.company, 'Target company'),
    source: jobText?.trim() ? 'Pasted job description' : jobUrl?.trim() ? jobUrl.trim() : 'Selected analysis',
    summary: safeText(result.job_summary, ''),
    missingRequired,
    missingNice,
    foundKeywords,
    unmet,
    met,
    quickWins,
    edges,
    priorityKeywords: [...missingRequired, ...missingNice, ...foundKeywords].filter(Boolean).slice(0, 14),
    criticalGaps: normalizeList(result.critical_gaps)
  }
}

function makeAlignedCvDraft(selected, jobText, jobUrl, cvFile) {
  const job = getJobContext(selected, jobText, jobUrl)
  const cvName = cvFile?.name || 'Selected CV'
  const keywords = job.priorityKeywords.length ? job.priorityKeywords : ['role-specific keywords', 'measurable outcomes', 'business impact']
  const requirements = job.unmet.length ? job.unmet : job.met.slice(0, 4)
  const firstEdge = job.edges[0] || 'operational impact, stakeholder support and measurable service delivery'
  const quickWins = job.quickWins.length ? job.quickWins : ['Add measurable results to the strongest experience bullets', 'Mirror the most important job keywords naturally', 'Clarify the scope of tools, users, teams and business impact']

  return {
    header: { before: cvName, after: `${job.title} · ${job.company}` },
    target: { title: job.title, company: job.company, source: job.source },
    summary: { before: 'Original CV summary preserved as the source profile.', after: `Profile aligned for ${job.title}: emphasize ${firstEdge}, then naturally include ${keywords.slice(0, 5).join(', ')} without inventing experience.` },
    keywords: { before: 'Missing keywords from the ATS analysis.', after: keywords.join(', ') },
    requirements: { before: 'Requirements that need clearer evidence in the CV.', after: requirements.length ? requirements.join('; ') : 'No major unmet requirements were detected. Keep the existing CV evidence clear and measurable.' },
    achievements: { before: 'Existing experience remains the source of truth.', after: quickWins.slice(0, 4).join(' | ') },
    sections: {
      headline: `${job.title} candidate with relevant delivery, tools and operational impact`,
      profile: `Job-aligned profile for ${job.title}. Keep the user's real CV experience, but strengthen wording around ${keywords.slice(0, 6).join(', ')}. Highlight ${firstEdge}.`,
      skills: keywords,
      requirements,
      bullets: quickWins.slice(0, 6).map(win => `Update a CV bullet to show: ${win}`),
      gaps: job.criticalGaps
    }
  }
}

function DraftRow({ title, before, after, t }) {
  return (
    <div className="cvBuilder-diffRow">
      <h4>{title}</h4>
      <div className="cvBuilder-diffGrid">
        <div><span>{t('current_cv_signal')}</span><p>{before}</p></div>
        <div><span>{t('job_aligned_update')}</span><p>{after}</p></div>
      </div>
    </div>
  )
}

export default function CvBuilderCard({ selected }) {
  const { t } = useLang()
  const { cvFile } = useCvPersist()
  const [jobText, setJobText] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState('')
  const [rebuilding, setRebuilding] = useState(false)

  const canBuild = !!cvFile && (!!selected?.result || jobText.trim().length > 80 || jobUrl.trim().length > 10)
  const job = useMemo(() => getJobContext(selected, jobText, jobUrl), [selected, jobText, jobUrl])

  const buildPreview = () => {
    setError('')
    if (!cvFile) {
      setError(t('cv_upload_first_error'))
      return
    }
    if (!selected?.result && jobText.trim().length < 80 && jobUrl.trim().length < 10) {
      setError(t('cv_analysis_first_error'))
      return
    }
    setRebuilding(true)
    window.setTimeout(() => {
      setPreview(makeAlignedCvDraft(selected, jobText, jobUrl, cvFile))
      setRebuilding(false)
    }, 350)
  }

  const handleExportDocx = async () => {
    if (!preview) return
    setError('')
    setExporting('docx')
    try { await downloadCvBuilderDocx(preview) } catch (e) { setError(e.message || 'Could not export Word document.') }
    setExporting('')
  }

  const handleExportPdf = () => {
    if (!preview) return
    setError('')
    setExporting('pdf')
    try { downloadCvBuilderPdf(preview) } catch (e) { setError(e.message || 'Could not export PDF document.') }
    setExporting('')
  }

  return (
    <section className="cvBuilder-card">
      <div className="cvBuilder-head">
        <div>
          <p>{t('cv_rebuilder_kicker')}</p>
          <h2>{t('cv_rebuilder_title')}</h2>
          <span>{t('cv_rebuilder_desc')}</span>
        </div>
        <strong>{t('downloadable')}</strong>
      </div>

      <div className="cvBuilder-flow">
        <div className="cvBuilder-step"><span>1</span><div><strong>{t('cv_source')}</strong><p>{cvFile ? cvFile.name : t('no_cv_selected')}</p></div></div>
        <div className="cvBuilder-step"><span>2</span><div><strong>{t('missing_keywords')}</strong><p>{job.priorityKeywords.length ? t('keywords_detected', { count: job.priorityKeywords.length }) : t('run_ats_first')}</p></div></div>
        <div className="cvBuilder-step"><span>3</span><div><strong>{t('adapted_cv_draft')}</strong><p>{preview ? t('ready_to_download') : t('not_generated_yet')}</p></div></div>
      </div>

      {!selected?.result && (
        <div className="cvBuilder-inputs">
          <label>{t('job_offer_link')}<input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="https://company.com/job-posting" /></label>
          <label>{t('job_description')}<textarea value={jobText} onChange={e => setJobText(e.target.value)} placeholder={t('job_description_placeholder')} rows={6} /></label>
        </div>
      )}

      {error && <p className="cvBuilder-error">⚠ {error}</p>}

      <button type="button" className="cvBuilder-primary" disabled={!canBuild || rebuilding} onClick={buildPreview}>
        {rebuilding ? t('adapting_cv') : t('generate_adapted_cv')}
      </button>

      {preview && (
        <div className="cvBuilder-preview">
          <div className="cvBuilder-previewHead"><div><p>{t('adapted_cv_draft')}</p><h3>{t('cv_preview_added')}</h3></div><span>{t('word_pdf_export')}</span></div>
          <DraftRow t={t} title={t('cv_positioning')} before={preview.header.before} after={preview.header.after} />
          <DraftRow t={t} title={t('professional_summary')} before={preview.summary.before} after={preview.summary.after} />
          <DraftRow t={t} title={t('missing_keywords_to_add')} before={preview.keywords.before} after={preview.keywords.after} />
          <DraftRow t={t} title={t('requirements_to_evidence')} before={preview.requirements.before} after={preview.requirements.after} />
          <DraftRow t={t} title={t('experience_bullet_updates')} before={preview.achievements.before} after={preview.achievements.after} />

          <div className="cvBuilder-exportActions">
            <button type="button" onClick={handleExportDocx} disabled={!!exporting}>{exporting === 'docx' ? t('preparing_word') : t('download_word_cv')}</button>
            <button type="button" onClick={handleExportPdf} disabled={!!exporting}>{exporting === 'pdf' ? t('preparing_pdf') : t('download_pdf_cv')}</button>
          </div>

          <p className="cvBuilder-note">{t('cv_rebuilder_note')}</p>
        </div>
      )}
    </section>
  )
}
