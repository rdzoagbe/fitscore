import React, { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../utils/deviceId'
import './ProfileOptimizerPage.css'

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read this file.'))
    reader.readAsDataURL(file)
  })
}

function looksLikeOnlyLinkedInUrl(value) {
  const text = String(value || '').trim()
  if (!text || text.split(/\s+/).length > 2) return false
  return /linkedin\.com\//i.test(text)
}

async function getFreshAccessToken(session) {
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
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
  const [result, setResult] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [importInfo, setImportInfo] = useState(null)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState(null)

  const hasEnoughProfileText = text.trim().length >= 120
  const canAnalyze = hasEnoughProfileText
  const scoreLabel = loading ? 'AI' : result?.score !== undefined ? `${result.score}%` : importInfo ? t('profile_pdf_imported', 'PDF imported') : hasEnoughProfileText ? t('profile_text_ready', 'Text ready') : t('profile_score_label', 'Profile')
  const scoreCaption = loading ? t('profile_analyzing') : result?.score !== undefined ? t('profile_score') : importInfo ? t('profile_ready_to_analyze', 'ready to analyze') : hasEnoughProfileText ? t('profile_ready_to_analyze', 'ready to analyze') : t('profile_ai_optimizer')

  const handleProfileTextChange = e => {
    const value = e.target.value
    if (looksLikeOnlyLinkedInUrl(value)) {
      setLinkedinUrl(value.trim())
      setText('')
      setResult(null)
      setChecklist(null)
      setImportInfo(null)
      setError('LinkedIn URL detected — paste it in the field above and click Fetch profile.')
      return
    }
    setText(value)
    setResult(null)
    setChecklist(null)
    setError('')
    setImportInfo(null)
  }

  const fetchProfileFromUrl = async () => {
    const url = linkedinUrl.trim()
    if (!url) return
    setError('')
    setFetchingUrl(true)
    setResult(null)
    setChecklist(null)
    setImportInfo(null)
    try {
      const res = await fetch('/api/profile-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_url', profileUrl: url })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not fetch this LinkedIn profile.')
      setText(data.text || '')
      setImportInfo({ filename: url, characters: data.characters || (data.text || '').length, pages: null })
    } catch (e) {
      setError(e.message || 'Could not fetch this LinkedIn profile. Try uploading your LinkedIn PDF instead.')
    } finally {
      setFetchingUrl(false)
    }
  }

  const importLinkedInPdf = async (file) => {
    if (!file) return
    setError('')
    setChecklist(null)
    setResult(null)
    setImportInfo(null)
    setImporting(true)
    try {
      if (file.type && file.type !== 'application/pdf') throw new Error(t('profile_pdf_only', 'Please upload a PDF file.'))
      const fileBase64 = await readFileAsBase64(file)
      const res = await fetch('/api/profile-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', fileBase64, filename: file.name })
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
    setError('')
    setChecklist(null)
    setResult(null)
    setUsage(null)
    if (!hasEnoughProfileText) { setError(t('profile_import_or_paste_required', 'Import your LinkedIn PDF or paste your profile text before analysis.')); return }

    setLoading(true)
    try {
      const accessToken = await getFreshAccessToken(session)
      if (!accessToken) {
        setError(t('profile_session_expired', 'Your session could not be verified. Please refresh the page or sign in again.'))
        setLoading(false)
        return
      }

      const res = await fetch('/api/profile-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Joblytics-Device-Id': getDeviceId()
        },
        body: JSON.stringify({ profileText: text, targetRole, profileUrl: null })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.code === 'PROFILE_TEXT_REQUIRED') {
          setChecklist(data.checklist || [])
          setResult({ target_role: targetRole?.trim() || 'Target role not specified' })
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
            <p>{t('profile_subtitle_pdf_clean', 'Import your LinkedIn profile PDF or paste your profile text. Joblytics analyzes the real content you provide and turns it into stronger recruiter-facing positioning.')}</p>
          </div>
          <div className="profileOpt-score"><strong>{scoreLabel}</strong><span>{scoreCaption}</span></div>
        </section>

        <section className="profileOpt-grid">
          <article className="profileOpt-card">
            <div className="profileOpt-importBox">
              <div>
                <p className="profileOpt-kicker">{t('profile_import_content_title', 'Import profile content')}</p>
                <h3>{t('profile_import_content_headline_clean', 'Upload LinkedIn PDF, then analyze')}</h3>
                <span>{t('profile_pdf_import_desc_clean', 'Export your own LinkedIn profile as a PDF, upload it here, and Joblytics will auto-fill the profile text for analysis.')}</span>
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

            <div className="profileOpt-importBox" style={{ marginTop: 16 }}>
              <div>
                <p className="profileOpt-kicker">Import from LinkedIn URL</p>
                <h3>Paste your LinkedIn profile URL</h3>
                <span>Joblytics will fetch your public profile and auto-fill the text area below. Works best with public profiles.</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={e => { setLinkedinUrl(e.target.value); setError('') }}
                  placeholder="https://linkedin.com/in/your-name"
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(16,24,43,0.18)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onKeyDown={e => e.key === 'Enter' && fetchProfileFromUrl()}
                />
                <button
                  type="button"
                  className="profileOpt-importBtn"
                  style={{ whiteSpace: 'nowrap', padding: '10px 18px' }}
                  onClick={fetchProfileFromUrl}
                  disabled={fetchingUrl || !linkedinUrl.trim()}
                >
                  {fetchingUrl ? 'Fetching…' : 'Fetch profile'}
                </button>
              </div>
              {importInfo && importInfo.filename?.includes('linkedin') && (
                <p className="profileOpt-importSuccess">✓ Profile fetched · {importInfo.characters} characters extracted</p>
              )}
            </div>

            <label>{t('profile_target_role')}<input value={targetRole} onChange={e => { setTargetRole(e.target.value); setResult(null); setChecklist(null); setError('') }} placeholder={t('profile_target_placeholder')} /></label>
            <label>{t('profile_text_label')}<textarea value={text} onChange={handleProfileTextChange} rows={14} placeholder={t('profile_text_placeholder_pdf_clean', 'Upload your LinkedIn PDF to auto-fill this box, or paste your Headline, About, Experience and Skills here...')} /></label>
            {text.trim().length > 0 && !hasEnoughProfileText && <p className="profileOpt-warning">{t('profile_min_warning')}</p>}
            {usage && <p className="profileOpt-warning">{t('profile_usage', { plan: usage.planLabel, used: usage.used, limit: usage.limit, remaining: usage.remaining })}</p>}
            {error && <p className="profileOpt-warning">{error}</p>}
            <button type="button" className="profileOpt-primary" disabled={!canAnalyze || loading || importing} onClick={runAnalysis}>{loading ? t('profile_analyzing') : t('profile_analyze_ai')}</button>
          </article>

          <aside className="profileOpt-card profileOpt-help">
            <p className="profileOpt-kicker">{t('profile_what_improves')}</p>
            <h2>{t('profile_sections')}</h2>
            <ul><li>{t('profile_role_positioning')}</li><li>{t('profile_headline')}</li><li>{t('profile_about')}</li><li>{t('profile_experience')}</li><li>{t('profile_keywords')}</li><li>{t('profile_evidence')}</li></ul>
            <p>{t('profile_help_desc_pdf_clean', 'The AI analyzes PDF-imported, URL-fetched, or pasted text only. It does not invent experience. Private profiles require a PDF upload.')}</p>
            <div className="profileOpt-futureNote"><strong>URL import tip</strong><p>Paste your public LinkedIn profile URL (linkedin.com/in/your-name) and click Fetch profile. If your profile is set to private, export it as a PDF from LinkedIn instead.</p></div>
          </aside>
        </section>

        {result && <section className="profileOpt-results">
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