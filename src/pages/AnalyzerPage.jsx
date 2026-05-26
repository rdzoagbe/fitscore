import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useLang } from '../context/LangContext'
import { useAnalyze } from '../hooks/useAnalyze'
import { useCvPersist } from '../hooks/useCvPersist'
import { useJobUrlHistory } from '../hooks/useJobUrlHistory'
import { sanitizeAnalysisForDisplay } from '../utils/analysisSanitizer'
import ResultsView from '../components/ResultsView'
import Confetti from '../components/Confetti'
import PWAInstallPrompt from '../components/PWAInstallPrompt'
import CvPanel from '../components/CvPanel'
import TipCard from '../components/TipCard'
import UpgradePrompt from '../components/UpgradePrompt'
import './AnalyzerPage.css'
import './analyzer-action-hub.css'

const LOADING_MSGS_KEY = ['loading_fetch','loading_cv','loading_ats','loading_score']
const MIN_JOB_TEXT_LENGTH = 60

function readClipperPayload() {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('source') !== 'clipper') return null
    const jobText = params.get('jobText') || ''
    const jobUrl = params.get('jobUrl') || ''
    const title = params.get('jobTitle') || ''
    const company = params.get('company') || ''
    return { jobText, jobUrl, title, company }
  } catch {
    return null
  }
}

function AnalyzeShortcut({ icon, title, text, onClick }) {
  return (
    <button type="button" className="analyzeHub-shortcut" onClick={onClick}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </button>
  )
}

export default function AnalyzerPage({ setPage, prefillAnalysis, onClearPrefill }) {
  const { t } = useLang()
  const [jobUrl, setJobUrl] = useState('')
  const [jobText, setJobText] = useState('')
  const [showTextPaste, setShowTextPaste] = useState(false)
  const [userToggledMode, setUserToggledMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [uploadTrigger, setUploadTrigger] = useState(0)
  const [clipperInfo, setClipperInfo] = useState(null)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const { status, data, error, savedRow, rateLimit, analyze, reset } = useAnalyze()
  const { cvFile } = useCvPersist()
  const { history: urlHistory } = useJobUrlHistory()
  const [viewingAnalysis, setViewingAnalysis] = useState(prefillAnalysis || null)
  const [showConfetti, setShowConfetti] = useState(false)

  const LOADING_MSGS = LOADING_MSGS_KEY.map(k => t(k))
  const isLimitError = status === 'error' && /limit|upgrade/i.test(String(error || ''))
  const normalizeJobUrl = value => {
    const withoutHiddenChars = String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '')
    const trimmed = withoutHiddenChars.trim()
    if (!trimmed) return ''
    const compactUrl = trimmed.replace(/\s+/g, '')
    const candidate = /^(https?:\/\/|www\.)/i.test(trimmed) ? compactUrl : trimmed
    if (/^https?:\/\//i.test(candidate)) return candidate
    if (/^www\./i.test(candidate)) return `https://${candidate}`
    if (candidate.includes('.') && !candidate.includes(' ')) return `https://${candidate}`
    return trimmed
  }
  const isValidUrl = str => {
    try {
      const u = new URL(normalizeJobUrl(str))
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch { return false }
  }
  const isLikelyJobDescription = value => {
    const text = String(value || '').trim()
    if (text.length < MIN_JOB_TEXT_LENGTH) return false
    if (isValidUrl(text)) return false
    return /\s/.test(text)
  }
  const detectRestrictedJobBoard = url => {
    if (!isValidUrl(url)) return null
    const lower = normalizeJobUrl(url).toLowerCase()
    if (lower.includes('linkedin.com')) return 'LinkedIn'
    if (lower.includes('indeed.')) return 'Indeed'
    if (lower.includes('glassdoor.')) return 'Glassdoor'
    if (lower.includes('welcometothejungle.com')) return 'Welcome to the Jungle'
    if (lower.includes('builtin.com') || lower.includes('built-in.com')) return 'Built In'
    return null
  }

  const normalizedJobUrl = normalizeJobUrl(jobUrl)
  const restrictedJobBoard = detectRestrictedJobBoard(jobUrl)
  const canAnalyzeUrl = isValidUrl(jobUrl)
  const canAnalyzePaste = jobText.trim().length >= MIN_JOB_TEXT_LENGTH
  const canAnalyze = status !== 'loading' && !!cvFile && (canAnalyzePaste || canAnalyzeUrl)
  const pasteProgress = Math.min(100, Math.round((jobText.trim().length / MIN_JOB_TEXT_LENGTH) * 100))

  useEffect(() => {
    const payload = readClipperPayload()
    if (!payload) return
    setClipperInfo(payload)
    if (payload.jobText && payload.jobText.trim().length >= MIN_JOB_TEXT_LENGTH) {
      setJobText(payload.jobText)
      setShowTextPaste(true)
      setUserToggledMode(false)
    } else if (payload.jobUrl) {
      setJobUrl(normalizeJobUrl(payload.jobUrl))
      setShowTextPaste(false)
      setUserToggledMode(false)
    }
    window.history.replaceState({ page: 'analyzer' }, '', '/analyzer')
  }, [])

  const switchToPasteMode = () => { setShowTextPaste(true); setUserToggledMode(true); setJobText('') }
  const handleUrlChange = e => {
    const value = e.target.value
    if (isLikelyJobDescription(value)) { setJobText(value); setJobUrl(''); setShowTextPaste(true); setUserToggledMode(false); return }
    setJobUrl(value)
  }
  const handlePasteTextChange = e => {
    const value = e.target.value
    if (isValidUrl(value)) { setJobUrl(normalizeJobUrl(value)); setJobText(''); setShowTextPaste(false); setUserToggledMode(false); return }
    setJobText(value)
  }
  const handleAnalyze = async () => {
    if (!cvFile) return

    setViewingAnalysis(null)
    intervalRef.current = setInterval(() => setMsgIdx(i => (i+1) % LOADING_MSGS.length), 1800)
    if (canAnalyzePaste) await analyze(null, cvFile, jobText.trim())
    else if (canAnalyzeUrl) await analyze(normalizedJobUrl, cvFile)
    clearInterval(intervalRef.current)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }
  const handleReset = useCallback(() => {
    reset(); setViewingAnalysis(null); setJobUrl(''); setJobText(''); setShowTextPaste(false); setUserToggledMode(false); setMsgIdx(0); setClipperInfo(null); onClearPrefill?.()
  }, [reset, onClearPrefill])

  useEffect(() => { if (prefillAnalysis) { setViewingAnalysis(prefillAnalysis); setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80) } }, [prefillAnalysis])
  useEffect(() => { if (status === 'done' && data?.display_score >= 70) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2600) } }, [status, data])

  const rawDisplayData = viewingAnalysis?.result || data
  const displayData = rawDisplayData ? sanitizeAnalysisForDisplay(rawDisplayData) : rawDisplayData
  const displayStatus = viewingAnalysis ? 'done' : status

  return (
    <div className="analyzePro-page">
      {showConfetti && <Confetti />}
      <main className="analyzePro-shell">
        {displayStatus !== 'done' && <div className="analyzePro-layout">
          <section className="analyzePro-card">
            <div className="analyzePro-formHero"><p>{t('analyzer_kicker')}</p><h1>{t('analyzer_title')}</h1><p>{t('analyzer_subtitle')}</p></div>
            {clipperInfo && <TipCard type="success" title="Job clipped from browser" body={`${clipperInfo.title || 'Job'}${clipperInfo.company ? ` at ${clipperInfo.company}` : ''} was imported into the analyzer. Upload or confirm your CV, then run the match.`} />}
            <CvPanel uploadTrigger={uploadTrigger} />
            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" onClick={() => { setShowTextPaste(false); setUserToggledMode(true) }} style={{ opacity: !showTextPaste ? 1 : 0.72 }}>{t('analyzer_url_mode')}</button>
                <button type="button" onClick={() => { setShowTextPaste(true); setUserToggledMode(true) }} style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: showTextPaste ? 'var(--accent-bg)' : 'var(--bg-input)', color: showTextPaste ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer' }}>{t('analyzer_paste_mode')}</button>
              </div>
              {!showTextPaste ? <>
                <input type="text" inputMode="url" value={jobUrl} onChange={handleUrlChange} onBlur={() => setJobUrl(value => normalizeJobUrl(value))} placeholder={t('analyzer_url_placeholder')} />
                {jobUrl.trim() && !isValidUrl(jobUrl) && <TipCard type="warning" title={t('analyzer_link_invalid_title')} body={t('analyzer_link_invalid_body')} />}
                {restrictedJobBoard && <><TipCard type="warning" title={t('analyzer_restricted_title', `${restrictedJobBoard} may limit automatic extraction`)} body={t('analyzer_restricted_body', 'Joblytics will try URL analysis first. If the page blocks extraction, use Mode texte for that specific job.')} /><button type="button" onClick={switchToPasteMode} style={{ width: '100%', marginTop: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontWeight: 900, cursor: 'pointer' }}>{t('analyzer_use_paste', 'Utiliser le mode texte')}</button></>}
                {urlHistory.length > 0 && <div style={{ marginTop: 10 }}><button type="button" onClick={() => setShowHistory(v => !v)} style={{ background: 'transparent', border: 0, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>{t('analyzer_recent_links')}</button>{showHistory && <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>{urlHistory.slice(0,5).map(url => <button key={url} type="button" onClick={() => { setJobUrl(normalizeJobUrl(url)); setJobText(''); setShowTextPaste(false); setShowHistory(false) }} style={{ textAlign: 'left', padding: 8, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</button>)}</div>}</div>}
              </> : <>
                <textarea value={jobText} onChange={handlePasteTextChange} placeholder={t('analyzer_paste_placeholder')} rows={10} />
                {jobText.trim().length > 0 && !canAnalyzePaste && <TipCard type="warning" title={t('analyzer_add_more_title')} body={t('analyzer_add_more_body', { min: MIN_JOB_TEXT_LENGTH, progress: pasteProgress })} />}
              </>}
              {isLimitError && <UpgradePrompt title={t('upgrade_analyze_title')} body={t('upgrade_analyze_body')} onUpgrade={() => setPage('billing')} />}
              {status === 'error' && !isLimitError && <TipCard type="error" title={t('analyzer_failed')} body={error} />}
              {status === 'loading' && <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>{LOADING_MSGS[msgIdx]}</p>}
              <button className="btn-primary" onClick={handleAnalyze} disabled={!canAnalyze && !restrictedJobBoard} style={{ width: '100%', marginTop: 14 }}>
                {status === 'loading'
                  ? t('analyzer_analyzing')
                  : t('analyzer_analyze_match')}
              </button>
            </div>
          </section>
          <aside className="analyzePro-side analyzeHub-side">
            <div className="analyzePro-sideCard analyzeHub-card">
              <p className="analyzePro-kicker">Action hub</p>
              <h3>After analysis, move faster</h3>
              <p>Use these shortcuts to continue the workflow without returning to the Dashboard.</p>
              <div className="analyzeHub-shortcuts">
                <AnalyzeShortcut icon="H" title="History" text="Review saved analyses in the compact table." onClick={() => setPage('history')} />
                <AnalyzeShortcut icon="CV" title="CV Coach" text="Generate cover letters and recruiter messages." onClick={() => setPage('coach')} />
                <AnalyzeShortcut icon="M" title="Smart Sync" text="Track recruiter replies and interviews." onClick={() => setPage('messages')} />
              </div>
            </div>
            <div className="analyzePro-sideCard"><p className="analyzePro-kicker">{t('analyzer_workflow')}</p><h3>{t('analyzer_workflow_title')}</h3><div className="analyzePro-steps"><div className="analyzePro-step"><span>1</span><div><strong>{t('analyzer_step1_title')}</strong><small>{t('analyzer_step1_body')}</small></div></div><div className="analyzePro-step"><span>2</span><div><strong>{t('analyzer_step2_title')}</strong><small>{t('analyzer_step2_body')}</small></div></div><div className="analyzePro-step"><span>3</span><div><strong>{t('analyzer_step3_title')}</strong><small>{t('analyzer_step3_body')}</small></div></div></div></div>
            <div className="analyzePro-sideCard"><p className="analyzePro-kicker">{t('analyzer_tip')}</p><h3>{t('analyzer_tip_title')}</h3><p>{t('analyzer_tip_body')}</p></div>
          </aside>
        </div>}
        {displayStatus === 'done' && displayData && <div ref={resultRef} className="page-enter"><ResultsView data={displayData} savedRow={viewingAnalysis ? viewingAnalysis : savedRow} rateLimit={rateLimit} onReset={handleReset} onGoCoach={() => setPage('coach')} /></div>}
      </main>
      <PWAInstallPrompt />
    </div>
  )
}
