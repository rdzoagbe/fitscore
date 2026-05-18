import React, { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { getDeviceId } from '../utils/deviceId'
import './ProfileOptimizerPage.css'

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()

function normalizeProfileUrl(value) {
  const raw = clean(value)
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^www\./i.test(raw)) return `https://${raw}`
  if (raw.includes('linkedin.com/')) return `https://${raw}`
  return raw
}

function isValidProfileUrl(value) {
  const url = normalizeProfileUrl(value)
  if (!url) return true
  try {
    const parsed = new URL(url)
    return parsed.hostname.includes('linkedin.com') && parsed.pathname.length > 1
  } catch {
    return false
  }
}

function looksLikeLinkedInUrl(value) {
  return isValidProfileUrl(value) && normalizeProfileUrl(value).includes('linkedin.com/')
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsDataURL(file)
  })
}

function CopyButton({ value, label, copiedLabel }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className="profileOpt-copy" onClick={() => { navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? copiedLabel : label}</button>
}

export default function ProfileOptimizerPage() {
  const { session } = useAuth()
  const { t } = useLang()
  const fileInputRef = useRef(null)
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [result, setResult] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importInfo, setImportInfo] = useState(null)
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState(null)

  const hasEnoughProfileText = text.trim().length >= 120
  const hasProfileUrl = normalizeProfileUrl(profileUrl).includes('linkedin.com/')
  const canAnalyze = hasEnoughProfileText
  const validProfileUrl = isValidProfileUrl(profileUrl)
  const scoreLabel = loading ? 'AI' : result?.score !== undefined ? `${result.score}%` : importInfo ? t('profile_pdf_imported', 'PDF imported') : hasEnoughProfileText ? t('profile_text_ready', 'Text ready') : hasProfileUrl ? t('profile_reference_only', 'Reference') : t('profile_score_label', 'Profile')
  const scoreCaption = loading ? t('profile_analyzing') : result?.score !== undefined ? t('profile_score') : importInfo ? t('profile_ready_to_analyze', 'ready to analyze') : hasEnoughProfileText ? t('profile_ready_to_analyze', 'ready to analyze') : hasProfileUrl ? t('profile_url_reference_only', 'url reference only') : t('profile_ai_optimizer')

  const handleProfileTextChange = e => {
    const value = e.target.value
    if (looksLikeLinkedInUrl(value) && value.trim().split(/\s+/).length <= 2) {
      setProfileUrl(normalizeProfileUrl(value)); setText(''); setResult(null); setChecklist(null); setError(''); setImportInfo(null); return
    }
    setText(value); setResult(null); setChecklist(null); setError(''); setImportInfo(null)
  }

  const importLinkedInPdf = async (file) => {
    if (!file) return
    setError(''); setChecklist(null); setResult(null); setImportInfo(null); setImporting(true)
    try {
      if (file.type && file.type !== 'application/pdf') throw new Error(t('profile_pdf_only', 'Please upload a PDF file.'))
      const fileBase64 = await readFileAsBase64(file)
      const res = await fetch('/api/profile-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, filename: file.name })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Import failed ${res.status}`)
      setText(data.text || '')
      setImportInfo({ filename: data.filename || file.name, characters: data.characters || (data.text || '').length, pages: data.pages || null })
    } catch (e) {
      setError(e.message || t('profile_pdf_import_failed', 'Could not import this LinkedIn PDF.'))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const runAnalysis = async () => {
    setError(''); setChecklist(null); setResult(null); setUsage(null)
    if (!validProfileUrl) { setError(t('profile_invalid_link')); return }
    if (!session?.access_token) { setError(t('profile_signin_required', 'Please sign in to analyze your LinkedIn profile.')); return }
    if (!hasEnoughProfileText) { setError(t('profile_import_or_paste_required', 'Import your LinkedIn PDF or paste your profile text before analysis.')); return }

    setLoading(true)
    try {
      const res = await fetch('/api/profile-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'X-Joblytics-Device-Id': getDeviceId()
        },
        body: JSON.stringify({ profileText: text, targetRole, profileUrl: normalizeProfileUrl(profileUrl) })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.code === 'PROFILE_TEXT_REQUIRED') {
          setChecklist(data.checklist || [])
          setResult({ profile_url: data.profileUrl || normalizeProfileUrl(profileUrl), target_role: clean(targetRole) || 'Target role not specified' })
          return
        }
        if (data?.usage) setUsage(data.usage)
        throw new Error(data?.error || `Server error ${res.status}`)
      }
      setUsage(data.usage || null)
      setResult(data.analysis)
    } catch (e) {
      setError(e.message || 'Profile optimization failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyLabel = t('profile_copy')
  const copiedLabel = t('profile_copied')

  return (
    <div className="profileOpt-page">
      <main className="profileOpt-shell">
        <section className="profileOpt-hero">
          <div>
            <p className="profileOpt-kicker">{t('profile_kicker')}</p>
            <h1>{t('profile_title')}</h1>
            <p>{t('profile_subtitle_pdf', 'Import your LinkedIn profile PDF or paste profile text. Joblytics analyzes the real content you provide and turns it into stronger recruiter-facing positioning.')}</p>
          </div>
          <div className="profileOpt-score"><strong>{scoreLabel}</strong><span>{scoreCaption}</span></div>
        </section>

        <section className="profileOpt-grid">
          <article className="profileOpt-card">
            <label>{t('profile_link_reference_label', 'LinkedIn profile link · reference only')}<input value={profileUrl} onChange={e => { setProfileUrl(e.target.value); setResult(null); setChecklist(null); setError('') }} onBlur={() => setProfileUrl(value => normalizeProfileUrl(value))} placeholder={t('profile_link_placeholder')} /></label>
            {profileUrl.trim() && !validProfileUrl && <p className="profileOpt-warning">{t('profile_invalid_link')}</p>}
            {hasProfileUrl && <p className="profileOpt-referenceNote">{t('profile_url_reference_note', 'This link is saved as a reference only. Joblytics does not scrape LinkedIn. Import a PDF or paste text to analyze your full profile.')}</p>}

            <div className="profileOpt-importBox">
              <div>
                <p className="profileOpt-kicker">{t('profile_import_content_title', 'Import profile content')}</p>
                <h3>{t('profile_import_content_headline', 'Upload LinkedIn PDF, then analyze')}</h3>
                <span>{t('profile_pdf_import_desc', 'Export your own LinkedIn profile as a PDF, upload it here, and Joblytics will auto-fill the profile text for analysis.')}</span>
              </div>
              <div className="profileOpt-steps">
                <div><span>1</span><p>{t('profile_pdf_step_1', 'Open your LinkedIn profile')}</p></div>
                <div><span>2</span><p>{t('profile_pdf_step_2', 'Click More / Resources')}</p></div>
                <div><span>3</span><p>{t('profile_pdf_step_3', 'Choose Save to PDF')}</p></div>
                <div><span>4</span><p>{t('profile_pdf_step_4', 'Upload the PDF here')}</p></div>
              </div>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={e => importLinkedInPdf(e.target.files?.[0])} hidden />
              <button type="button" className="profileOpt-importBtn" onClick={() => fileInputRef.current?.click()} disabled={importing}>{importing ? t('profile_pdf_importing', 'Importing PDF...') : t('profile_pdf_import_cta', 'Upload LinkedIn PDF')}</button>
              {importInfo && <p className="profileOpt-importSuccess">✓ {t('profile_pdf_import_success', { name: importInfo.filename, count: importInfo.characters }, `Imported ${importInfo.filename} · ${importInfo.characters} characters`)}</p>}
            </div>

            <label>{t('profile_target_role')}<input value={targetRole} onChange={e => { setTargetRole(e.target.value); setResult(null); setChecklist(null); setError('') }} placeholder={t('profile_target_placeholder')} /></label>
            <label>{t('profile_text_label')}<textarea value={text} onChange={handleProfileTextChange} rows={14} placeholder={t('profile_text_placeholder_pdf', 'Upload your LinkedIn PDF to auto-fill this box, or paste your Headline, About, Experience and Skills here...')} /></label>
            {text.trim().length > 0 && !hasEnoughProfileText && <p className="profileOpt-warning">{t('profile_min_warning')}</p>}
            {hasProfileUrl && !hasEnoughProfileText && <p className="profileOpt-warning">{t('profile_link_detected_pdf', 'LinkedIn URL is not enough for analysis. Upload your LinkedIn PDF or paste your profile text.')}</p>}
            {usage && <p className="profileOpt-warning">{t('profile_usage', { plan: usage.planLabel, used: usage.used, limit: usage.limit, remaining: usage.remaining })}</p>}
            {error && <p className="profileOpt-warning">{error}</p>}
            <button type="button" className="profileOpt-primary" disabled={!canAnalyze || !validProfileUrl || loading || importing} onClick={runAnalysis}>{loading ? t('profile_analyzing') : t('profile_analyze_ai')}</button>
          </article>

          <aside className="profileOpt-card profileOpt-help">
            <p className="profileOpt-kicker">{t('profile_what_improves')}</p>
            <h2>{t('profile_sections')}</h2>
            <ul><li>{t('profile_role_positioning')}</li><li>{t('profile_headline')}</li><li>{t('profile_about')}</li><li>{t('profile_experience')}</li><li>{t('profile_keywords')}</li><li>{t('profile_evidence')}</li></ul>
            <p>{t('profile_help_desc_pdf', 'The LinkedIn URL is a reference only. The AI analyzes PDF-imported or pasted text so it does not invent experience or scrape inaccessible LinkedIn pages.')}</p>
            <div className="profileOpt-futureNote"><strong>{t('profile_future_import_title', 'Future option')}</strong><p>{t('profile_future_import_body', 'A one-click LinkedIn import could be added later through a browser extension, where the user imports their own visible profile content from their own browser session.')}</p></div>
          </aside>
        </section>

        {result && <section className="profileOpt-results">
          {result.profile_url && <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">{t('profile_link_ref')}</p><h2>{t('profile_link_ref_saved')}</h2></div><CopyButton value={result.profile_url} label={copyLabel} copiedLabel={copiedLabel} /></div><p className="profileOpt-block">{result.profile_url}</p></article>}

          {checklist && <article className="profileOpt-card"><p className="profileOpt-kicker">{t('profile_next_step')}</p><h2>{t('profile_paste_text_title')}</h2><p className="profileOpt-block">{t('profile_paste_text_desc')}</p><div className="profileOpt-bullets">{checklist.map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>}

          {!checklist && <>
            <article className="profileOpt-card"><p className="profileOpt-kicker">{t('profile_positioning')}</p><h2>{t('profile_role_alignment')}</h2><p className="profileOpt-block">{result.role_alignment}</p><p className="profileOpt-block">{result.current_positioning}</p></article>
            <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">{t('profile_headline')}</p><h2>{t('profile_ai_headline')}</h2></div><CopyButton value={result.improved_headline} label={copyLabel} copiedLabel={copiedLabel} /></div><p className="profileOpt-block">{result.improved_headline}</p></article>
            <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">{t('profile_about')}</p><h2>{t('profile_ai_about')}</h2></div><CopyButton value={result.improved_about} label={copyLabel} copiedLabel={copiedLabel} /></div><p className="profileOpt-block">{result.improved_about}</p></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">{t('profile_keywords')}</p><h2>{t('profile_recruiter_keywords')}</h2><div className="profileOpt-tags">{(result.keyword_gaps || []).map(word => <span key={word}>{word}</span>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">{t('profile_experience')}</p><h2>{t('profile_ai_bullets')}</h2><div className="profileOpt-bullets">{(result.experience_bullets || []).map((bullet, index) => <div key={bullet} className="profileOpt-bullet"><span>{index + 1}</span><p>{bullet}</p><CopyButton value={bullet} label={copyLabel} copiedLabel={copiedLabel} /></div>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">{t('profile_priority')}</p><h2>{t('profile_priority_title')}</h2><div className="profileOpt-bullets">{(result.priority_fixes || []).map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">{t('profile_proof')}</p><h2>{t('profile_proof_title')}</h2><div className="profileOpt-bullets">{(result.proof_needed || []).map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>
          </>}
        </section>}
      </main>
    </div>
  )
}