import React, { useEffect, useMemo, useState } from 'react'
import { useCvPersist } from '../hooks/useCvPersist'
import { useLang } from '../context/LangContext'
import { downloadCvBuilderDocx, downloadCvBuilderPdf } from '../utils/cvBuilderExports'

const VERSION_KEY = 'joblytics_cv_builder_versions_v1'

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeList(values = []) {
  return values
    .flat()
    .map(item => typeof item === 'string' ? item : item?.tip || item?.area || item?.prep_tip || item?.text || item?.label || '')
    .map(item => item.trim())
    .filter(Boolean)
}

function asLines(value = '') {
  return String(value || '').split('\n').map(item => item.trim()).filter(Boolean)
}

function joinLines(values = []) {
  return normalizeList(values).join('\n')
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
    },
    provenance: {
      source: 'Current CV is the source of truth',
      aiRewrite: 'AI wording is a draft only',
      needsProof: 'Keep only claims you can evidence'
    }
  }
}

function makeEditorState(preview) {
  const sections = preview?.sections || {}
  return {
    headline: sections.headline || preview?.header?.after || '',
    profile: sections.profile || preview?.summary?.after || '',
    skills: joinLines(sections.skills) || String(preview?.keywords?.after || '').split(',').map(s => s.trim()).filter(Boolean).join('\n'),
    requirements: joinLines(sections.requirements) || String(preview?.requirements?.after || '').split(';').map(s => s.trim()).filter(Boolean).join('\n'),
    bullets: joinLines(sections.bullets) || String(preview?.achievements?.after || '').split('|').map(s => s.trim()).filter(Boolean).join('\n'),
    gaps: joinLines(sections.gaps)
  }
}

function applyEditorToPreview(preview, editor) {
  if (!preview) return null
  const skills = asLines(editor.skills)
  const requirements = asLines(editor.requirements)
  const bullets = asLines(editor.bullets)
  const gaps = asLines(editor.gaps)

  return {
    ...preview,
    header: { ...preview.header, after: editor.headline || preview.header?.after },
    summary: { ...preview.summary, after: editor.profile || preview.summary?.after },
    keywords: { ...preview.keywords, after: skills.join(', ') },
    requirements: { ...preview.requirements, after: requirements.join('; ') },
    achievements: { ...preview.achievements, after: bullets.join(' | ') },
    sections: {
      ...(preview.sections || {}),
      headline: editor.headline,
      profile: editor.profile,
      skills,
      requirements,
      bullets,
      gaps
    }
  }
}

function loadVersions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VERSION_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.slice(0, 8) : []
  } catch {
    return []
  }
}

function saveVersions(versions) {
  try { localStorage.setItem(VERSION_KEY, JSON.stringify(versions.slice(0, 8))) } catch {}
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

function EditableField({ label, hint, value, onChange, multiline = true }) {
  return (
    <label className="cvWorkspace-field">
      <span>{label}</span>
      {hint && <em>{hint}</em>}
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={label.toLowerCase().includes('profile') ? 5 : 4} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} />
      )}
    </label>
  )
}

function ProvenanceBadge({ type, children }) {
  return <span className={`cvWorkspace-provenance cvWorkspace-provenance--${type}`}>{children}</span>
}

function LivePreview({ preview, editor, t }) {
  const model = applyEditorToPreview(preview, editor)
  const sections = model?.sections || {}
  const list = (values = []) => values?.length ? values : []

  return (
    <aside className="cvWorkspace-livePreview">
      <div className="cvWorkspace-previewPaper">
        <p className="cvWorkspace-previewKicker">{t('cv_live_preview', 'Live CV preview')}</p>
        <h3>{sections.headline || t('cv_job_aligned_candidate', 'Job-aligned candidate profile')}</h3>
        <p className="cvWorkspace-profileText">{sections.profile}</p>

        <div className="cvWorkspace-previewSection">
          <strong>{t('cv_core_skills', 'Core skills')}</strong>
          <div className="cvWorkspace-chipList">{list(sections.skills).slice(0, 14).map(item => <span key={item}>{item}</span>)}</div>
        </div>

        <div className="cvWorkspace-previewSection">
          <strong>{t('cv_requirements_visible', 'Requirements made visible')}</strong>
          {list(sections.requirements).length ? <ul>{sections.requirements.slice(0, 8).map(item => <li key={item}>{item}</li>)}</ul> : <p>{t('cv_no_requirements_preview', 'No unmet requirements selected.')}</p>}
        </div>

        <div className="cvWorkspace-previewSection">
          <strong>{t('cv_bullet_updates', 'Experience bullets to update')}</strong>
          {list(sections.bullets).length ? <ul>{sections.bullets.slice(0, 8).map(item => <li key={item}>{item}</li>)}</ul> : <p>{t('cv_no_bullets_preview', 'Add bullet rewrite ideas here.')}</p>}
        </div>

        {list(sections.gaps).length > 0 && (
          <div className="cvWorkspace-previewSection cvWorkspace-previewWarning">
            <strong>{t('cv_gaps_to_handle', 'Gaps to handle carefully')}</strong>
            <ul>{sections.gaps.slice(0, 5).map(item => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
      </div>
    </aside>
  )
}

export default function CvBuilderCard({ selected }) {
  const { t } = useLang()
  const { cvFile } = useCvPersist()
  const [jobText, setJobText] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [editor, setEditor] = useState(null)
  const [versions, setVersions] = useState([])
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState('')
  const [rebuilding, setRebuilding] = useState(false)

  const canBuild = !!cvFile && (!!selected?.result || jobText.trim().length > 80 || jobUrl.trim().length > 10)
  const job = useMemo(() => getJobContext(selected, jobText, jobUrl), [selected, jobText, jobUrl])
  const editedPreview = useMemo(() => applyEditorToPreview(preview, editor || {}), [preview, editor])

  useEffect(() => setVersions(loadVersions()), [])

  const updateEditor = (key, value) => setEditor(current => ({ ...(current || {}), [key]: value }))

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
      const draft = makeAlignedCvDraft(selected, jobText, jobUrl, cvFile)
      setPreview(draft)
      setEditor(makeEditorState(draft))
      setRebuilding(false)
    }, 350)
  }

  const resetToAiDraft = () => {
    if (!preview) return
    setEditor(makeEditorState(preview))
  }

  const saveVersion = () => {
    if (!editedPreview || !editor) return
    const item = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: editedPreview.header?.after || editedPreview.sections?.headline || 'Job-aligned CV draft',
      target: editedPreview.target,
      editor
    }
    const next = [item, ...versions].slice(0, 8)
    setVersions(next)
    saveVersions(next)
  }

  const loadVersion = version => {
    if (!version?.editor) return
    setEditor(version.editor)
  }

  const handleExportDocx = async () => {
    if (!editedPreview) return
    setError('')
    setExporting('docx')
    try { await downloadCvBuilderDocx(editedPreview) } catch (e) { setError(e.message || 'Could not export Word document.') }
    setExporting('')
  }

  const handleExportPdf = () => {
    if (!editedPreview) return
    setError('')
    setExporting('pdf')
    try { downloadCvBuilderPdf(editedPreview) } catch (e) { setError(e.message || 'Could not export PDF document.') }
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

      {preview && editor && editedPreview && (
        <div className="cvBuilder-preview">
          <div className="cvBuilder-previewHead"><div><p>{t('phase3_cv_workspace', 'Structured CV workspace')}</p><h3>{t('cv_editor_title', 'Edit, verify and export your tailored CV')}</h3></div><span>{t('word_pdf_export')}</span></div>

          <div className="cvWorkspace-trustStrip">
            <ProvenanceBadge type="source">✓ {t('cv_source_of_truth', 'Current CV is source of truth')}</ProvenanceBadge>
            <ProvenanceBadge type="ai">✨ {t('cv_ai_draft_label', 'AI draft suggestions')}</ProvenanceBadge>
            <ProvenanceBadge type="proof">⚠ {t('cv_keep_only_true', 'Keep only what you can prove')}</ProvenanceBadge>
          </div>

          <div className="cvWorkspace-layout">
            <div className="cvWorkspace-editor">
              <div className="cvWorkspace-toolbar">
                <div>
                  <strong>{t('cv_editor_workspace', 'Editable CV sections')}</strong>
                  <p>{t('cv_editor_workspace_desc', 'Review each suggestion. Rewrite anything that is not accurate before exporting.')}</p>
                </div>
                <div className="cvWorkspace-toolbarActions">
                  <button type="button" onClick={resetToAiDraft}>{t('cv_reset_ai_draft', 'Reset AI draft')}</button>
                  <button type="button" onClick={saveVersion}>{t('cv_save_version', 'Save version')}</button>
                </div>
              </div>

              <EditableField label={t('cv_headline_label', 'Target headline')} hint={t('cv_headline_hint', 'One sentence positioning for the target job.')} value={editor.headline} onChange={value => updateEditor('headline', value)} multiline={false} />
              <EditableField label={t('cv_profile_label', 'Professional profile')} hint={t('cv_profile_hint', 'Keep it truthful. Strengthen wording but do not add fake claims.')} value={editor.profile} onChange={value => updateEditor('profile', value)} />
              <EditableField label={t('cv_skills_label', 'Core skills / keywords')} hint={t('cv_one_per_line', 'One item per line.')} value={editor.skills} onChange={value => updateEditor('skills', value)} />
              <EditableField label={t('cv_requirements_label', 'Requirements to make visible')} hint={t('cv_requirement_hint', 'Only keep requirements you can support with real evidence.')} value={editor.requirements} onChange={value => updateEditor('requirements', value)} />
              <EditableField label={t('cv_bullets_label', 'Experience bullets to update')} hint={t('cv_bullet_hint', 'Turn these into measurable, role-aligned bullets.')} value={editor.bullets} onChange={value => updateEditor('bullets', value)} />
              <EditableField label={t('cv_gaps_label', 'Gaps to handle carefully')} hint={t('cv_gaps_hint', 'Do not invent these. Use training, adjacent experience or recruiter questions.')} value={editor.gaps} onChange={value => updateEditor('gaps', value)} />
            </div>

            <LivePreview preview={preview} editor={editor} t={t} />
          </div>

          <div className="cvWorkspace-versions">
            <div><strong>{t('cv_versions_title', 'Saved versions')}</strong><p>{t('cv_versions_desc', 'Local version history for this browser. Use it to compare drafts before exporting.')}</p></div>
            {versions.length ? <div className="cvWorkspace-versionList">{versions.map(version => <button key={version.id} type="button" onClick={() => loadVersion(version)}><strong>{version.title}</strong><span>{new Date(version.createdAt).toLocaleString()}</span></button>)}</div> : <span>{t('cv_no_versions_yet', 'No saved versions yet.')}</span>}
          </div>

          <DraftRow t={t} title={t('cv_positioning')} before={editedPreview.header.before} after={editedPreview.header.after} />
          <DraftRow t={t} title={t('professional_summary')} before={editedPreview.summary.before} after={editedPreview.summary.after} />
          <DraftRow t={t} title={t('missing_keywords_to_add')} before={editedPreview.keywords.before} after={editedPreview.keywords.after} />
          <DraftRow t={t} title={t('requirements_to_evidence')} before={editedPreview.requirements.before} after={editedPreview.requirements.after} />
          <DraftRow t={t} title={t('experience_bullet_updates')} before={editedPreview.achievements.before} after={editedPreview.achievements.after} />

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
