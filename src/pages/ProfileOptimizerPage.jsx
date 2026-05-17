import React, { useState } from 'react'
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

function CopyButton({ value, label, copiedLabel }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className="profileOpt-copy" onClick={() => { navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? copiedLabel : label}</button>
}

export default function ProfileOptimizerPage() {
  const { session } = useAuth()
  const { t } = useLang()
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [result, setResult] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState(null)

  const hasEnoughProfileText = text.trim().length >= 120
  const hasProfileUrl = normalizeProfileUrl(profileUrl).includes('linkedin.com/')
  const canAnalyze = hasEnoughProfileText || hasProfileUrl
  const validProfileUrl = isValidProfileUrl(profileUrl)
  const scoreLabel = loading ? 'AI' : result?.score !== undefined ? `${result.score}%` : hasProfileUrl && !hasEnoughProfileText ? t('profile_ready') : t('profile_score_label', 'Profile')
  const scoreCaption = loading ? t('profile_analyzing') : result?.score !== undefined ? t('profile_score') : hasProfileUrl && !hasEnoughProfileText ? t('profile_link_saved') : t('profile_ai_optimizer')

  const handleProfileTextChange = e => {
    const value = e.target.value
    if (looksLikeLinkedInUrl(value) && value.trim().split(/\s+/).length <= 2) {
      setProfileUrl(normalizeProfileUrl(value))
      setText('')
      setResult(null)
      setChecklist(null)
      setError('')
      return
    }
    setText(value)
    setResult(null)
    setChecklist(null)
    setError('')
  }

  const runAnalysis = async () => {
    setError('')
    setChecklist(null)
    setResult(null)
    setUsage(null)

    if (!validProfileUrl) {
      setError(t('profile_invalid_link'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
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
            <p>{t('profile_subtitle')}</p>
          </div>
          <div className="profileOpt-score"><strong>{scoreLabel}</strong><span>{scoreCaption}</span></div>
        </section>

        <section className="profileOpt-grid">
          <article className="profileOpt-card">
            <label>{t('profile_link_label')}<input value={profileUrl} onChange={e => { setProfileUrl(e.target.value); setResult(null); setChecklist(null); setError('') }} onBlur={() => setProfileUrl(value => normalizeProfileUrl(value))} placeholder={t('profile_link_placeholder')} /></label>
            {profileUrl.trim() && !validProfileUrl && <p className="profileOpt-warning">{t('profile_invalid_link')}</p>}
            <label>{t('profile_target_role')}<input value={targetRole} onChange={e => { setTargetRole(e.target.value); setResult(null); setChecklist(null); setError('') }} placeholder={t('profile_target_placeholder')} /></label>
            <label>{t('profile_text_label')}<textarea value={text} onChange={handleProfileTextChange} rows={14} placeholder={t('profile_text_placeholder')} /></label>
            {text.trim().length > 0 && !hasEnoughProfileText && <p className="profileOpt-warning">{t('profile_min_warning')}</p>}
            {hasProfileUrl && !hasEnoughProfileText && <p className="profileOpt-warning">{t('profile_link_detected')}</p>}
            {usage && <p className="profileOpt-warning">{t('profile_usage', { plan: usage.planLabel, used: usage.used, limit: usage.limit, remaining: usage.remaining })}</p>}
            {error && <p className="profileOpt-warning">{error}</p>}
            <button type="button" className="profileOpt-primary" disabled={!canAnalyze || !validProfileUrl || loading} onClick={runAnalysis}>{loading ? t('profile_analyzing') : hasEnoughProfileText ? t('profile_analyze_ai') : t('profile_check_link')}</button>
          </article>

          <aside className="profileOpt-card profileOpt-help">
            <p className="profileOpt-kicker">{t('profile_what_improves')}</p>
            <h2>{t('profile_sections')}</h2>
            <ul><li>{t('profile_role_positioning')}</li><li>{t('profile_headline')}</li><li>{t('profile_about')}</li><li>{t('profile_experience')}</li><li>{t('profile_keywords')}</li><li>{t('profile_evidence')}</li></ul>
            <p>{t('profile_help_desc')}</p>
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