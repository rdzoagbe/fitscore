import React, { useMemo, useState } from 'react'
import { useCvPersist } from '../hooks/useCvPersist'
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
    header: {
      before: cvName,
      after: `${job.title} · ${job.company}`
    },
    target: {
      title: job.title,
      company: job.company,
      source: job.source
    },
    summary: {
      before: 'Original CV summary preserved as the source profile.',
      after: `Profile aligned for ${job.title}: emphasize ${firstEdge}, then naturally include ${keywords.slice(0, 5).join(', ')} without inventing experience.`
    },
    keywords: {
      before: 'Missing keywords from the ATS analysis.',
      after: keywords.join(', ')
    },
    requirements: {
      before: 'Requirements that need clearer evidence in the CV.',
      after: requirements.length ? requirements.join('; ') : 'No major unmet requirements were detected. Keep the existing CV evidence clear and measurable.'
    },
    achievements: {
      before: 'Existing experience remains the source of truth.',
      after: quickWins.slice(0, 4).join(' | ')
    },
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

function DraftRow({ title, before, after }) {
  return (
    <div className="cvBuilder-diffRow">
      <h4>{title}</h4>
      <div className="cvBuilder-diffGrid">
        <div>
          <span>Current CV signal</span>
          <p>{before}</p>
        </div>
        <div>
          <span>Job-aligned update</span>
          <p>{after}</p>
        </div>
      </div>
    </div>
  )
}

export default function CvBuilderCard({ selected }) {
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
      setError('Upload or select a CV first. Use the Analyzer upload area so Joblytics can reuse your current CV.')
      return
    }
    if (!selected?.result && jobText.trim().length < 80 && jobUrl.trim().length < 10) {
      setError('Run or select an analysis first so Joblytics can use the missing keywords and requirements.')
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
    try {
      await downloadCvBuilderDocx(preview)
    } catch (e) {
      setError(e.message || 'Could not export Word document.')
    }
    setExporting('')
  }

  const handleExportPdf = () => {
    if (!preview) return
    setError('')
    setExporting('pdf')
    try {
      downloadCvBuilderPdf(preview)
    } catch (e) {
      setError(e.message || 'Could not export PDF document.')
    }
    setExporting('')
  }

  return (
    <section className="cvBuilder-card">
      <div className="cvBuilder-head">
        <div>
          <p>CV Rebuilder · Missing keyword adapter</p>
          <h2>Generate a job-aligned CV draft.</h2>
          <span>Uses your current CV as the source and adapts it with missing keywords, unmet requirements and quick wins from the ATS analysis.</span>
        </div>
        <strong>Downloadable</strong>
      </div>

      <div className="cvBuilder-flow">
        <div className="cvBuilder-step">
          <span>1</span>
          <div>
            <strong>CV source</strong>
            <p>{cvFile ? cvFile.name : 'No CV selected yet'}</p>
          </div>
        </div>
        <div className="cvBuilder-step">
          <span>2</span>
          <div>
            <strong>Missing keywords</strong>
            <p>{job.priorityKeywords.length ? `${job.priorityKeywords.length} keywords detected` : 'Run an ATS analysis first'}</p>
          </div>
        </div>
        <div className="cvBuilder-step">
          <span>3</span>
          <div>
            <strong>Adapted CV draft</strong>
            <p>{preview ? 'Ready to download' : 'Not generated yet'}</p>
          </div>
        </div>
      </div>

      {!selected?.result && (
        <div className="cvBuilder-inputs">
          <label>
            Job offer link
            <input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="https://company.com/job-posting" />
          </label>
          <label>
            Job description
            <textarea value={jobText} onChange={e => setJobText(e.target.value)} placeholder="Paste the job description here if you want to build without a saved analysis..." rows={6} />
          </label>
        </div>
      )}

      {error && <p className="cvBuilder-error">⚠ {error}</p>}

      <button type="button" className="cvBuilder-primary" disabled={!canBuild || rebuilding} onClick={buildPreview}>
        {rebuilding ? 'Adapting CV with missing keywords...' : 'Generate adapted CV draft →'}
      </button>

      {preview && (
        <div className="cvBuilder-preview">
          <div className="cvBuilder-previewHead">
            <div>
              <p>Adapted CV draft</p>
              <h3>What will be added to the user CV</h3>
            </div>
            <span>Word + PDF export</span>
          </div>
          <DraftRow title="CV positioning" before={preview.header.before} after={preview.header.after} />
          <DraftRow title="Professional summary" before={preview.summary.before} after={preview.summary.after} />
          <DraftRow title="Missing keywords to add" before={preview.keywords.before} after={preview.keywords.after} />
          <DraftRow title="Requirements to evidence" before={preview.requirements.before} after={preview.requirements.after} />
          <DraftRow title="Experience bullet updates" before={preview.achievements.before} after={preview.achievements.after} />

          <div className="cvBuilder-exportActions">
            <button type="button" onClick={handleExportDocx} disabled={!!exporting}>
              {exporting === 'docx' ? 'Preparing Word...' : 'Download adapted Word CV'}
            </button>
            <button type="button" onClick={handleExportPdf} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Preparing PDF...' : 'Download adapted PDF CV'}
            </button>
          </div>

          <p className="cvBuilder-note">This creates an adapted CV draft from the current CV signals and ATS gaps. Review every line before applying and only keep claims you can prove.</p>
        </div>
      )}
    </section>
  )
}
