import React, { useMemo, useState } from 'react'
import { useCvPersist } from '../hooks/useCvPersist'
import { downloadCvBuilderDocx, downloadCvBuilderPdf } from '../utils/cvBuilderExports'

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function getJobContext(selected, jobText, jobUrl) {
  const ctx = selected?.result?.job_context || {}
  return {
    title: safeText(ctx.title, 'Target role'),
    company: safeText(ctx.company, 'Target company'),
    source: jobText?.trim() ? 'Pasted job description' : jobUrl?.trim() ? jobUrl.trim() : 'Selected analysis',
    keywords: [
      ...(selected?.result?.keyword_match?.missing_required || []),
      ...(selected?.result?.keyword_match?.matched || []),
      ...(selected?.result?.hard_skills || [])
    ].filter(Boolean).slice(0, 10),
    edges: selected?.result?.interview_prep?.your_edges || [],
    quickWins: selected?.result?.quick_wins || []
  }
}

function makePreview(selected, jobText, jobUrl, cvFile) {
  const job = getJobContext(selected, jobText, jobUrl)
  const cvName = cvFile?.name || 'Selected CV'
  const primaryKeywords = job.keywords.length ? job.keywords : ['role-specific keywords', 'measurable outcomes', 'business impact']
  const firstEdge = job.edges?.[0] || 'proven operational impact and stakeholder-facing delivery'
  const firstWin = typeof job.quickWins?.[0] === 'string' ? job.quickWins[0] : job.quickWins?.[0]?.tip

  return {
    header: {
      before: cvName,
      after: `${job.title} · ${job.company}`
    },
    summary: {
      before: 'Generic professional summary from the current CV.',
      after: `Reframed profile for ${job.title}, highlighting ${firstEdge} and aligning the opening section with ${job.company || 'the target company'}.`
    },
    keywords: {
      before: 'Keywords may be present but are not explicitly aligned to the job description.',
      after: `Priority keywords to weave naturally: ${primaryKeywords.join(', ')}.`
    },
    achievements: {
      before: 'Responsibilities-led bullets with limited measurable outcomes.',
      after: firstWin || 'Rewrite bullets to emphasize scope, measurable delivery, SLA impact, users supported, tooling, and operational outcomes.'
    }
  }
}

function DiffRow({ title, before, after }) {
  return (
    <div className="cvBuilder-diffRow">
      <h4>{title}</h4>
      <div className="cvBuilder-diffGrid">
        <div>
          <span>Before</span>
          <p>{before}</p>
        </div>
        <div>
          <span>After</span>
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

  const canBuild = !!cvFile && (!!selected?.result || jobText.trim().length > 80 || jobUrl.trim().length > 10)
  const job = useMemo(() => getJobContext(selected, jobText, jobUrl), [selected, jobText, jobUrl])

  const buildPreview = () => {
    setError('')
    if (!cvFile) {
      setError('Upload or select a CV first. For now, use the Analyzer upload flow so the builder can reuse your current CV.')
      return
    }
    if (!selected?.result && jobText.trim().length < 80 && jobUrl.trim().length < 10) {
      setError('Select an analysis, paste a job description, or add a job link before building a rewritten CV preview.')
      return
    }
    setPreview(makePreview(selected, jobText, jobUrl, cvFile))
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
          <p>CV Builder · Foundation</p>
          <h2>Regenerate a full CV for this job.</h2>
          <span>This is separate from CV Optimizer. The builder prepares a full rewrite workflow with a before/after preview.</span>
        </div>
        <strong>Phase 3</strong>
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
            <strong>Target job</strong>
            <p>{job.title} {job.company !== 'Target company' ? `@ ${job.company}` : ''}</p>
          </div>
        </div>
        <div className="cvBuilder-step">
          <span>3</span>
          <div>
            <strong>Rewrite preview</strong>
            <p>{preview ? 'Preview ready' : 'Not generated yet'}</p>
          </div>
        </div>
      </div>

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

      {error && <p className="cvBuilder-error">⚠ {error}</p>}

      <button type="button" className="cvBuilder-primary" disabled={!canBuild} onClick={buildPreview}>
        Build rewrite preview →
      </button>

      {preview && (
        <div className="cvBuilder-preview">
          <div className="cvBuilder-previewHead">
            <div>
              <p>Preview diff</p>
              <h3>What the full CV rewrite will change</h3>
            </div>
            <span>Word + PDF ready</span>
          </div>
          <DiffRow title="Header positioning" before={preview.header.before} after={preview.header.after} />
          <DiffRow title="Professional summary" before={preview.summary.before} after={preview.summary.after} />
          <DiffRow title="Keyword alignment" before={preview.keywords.before} after={preview.keywords.after} />
          <DiffRow title="Achievement framing" before={preview.achievements.before} after={preview.achievements.after} />

          <div className="cvBuilder-exportActions">
            <button type="button" onClick={handleExportDocx} disabled={!!exporting}>
              {exporting === 'docx' ? 'Preparing Word...' : 'Download Word'}
            </button>
            <button type="button" onClick={handleExportPdf} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>

          <p className="cvBuilder-note">This export is a structured rewrite preview. Next step is connecting the builder to the real AI regeneration endpoint and saving generated CV versions to Supabase.</p>
        </div>
      )}
    </section>
  )
}
