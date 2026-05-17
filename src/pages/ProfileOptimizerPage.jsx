import React, { useMemo, useState } from 'react'
import './ProfileOptimizerPage.css'

const KEYWORDS = ['Microsoft 365', 'Intune', 'Azure', 'ITIL', 'SLA', 'KPI', 'endpoint security', 'service delivery', 'team leadership', 'PowerShell']

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const lines = value => String(value || '').split('\n').map(clean).filter(Boolean)

function has(text, term) {
  return text.toLowerCase().includes(term.toLowerCase())
}

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

function detectRole(text) {
  const lower = text.toLowerCase()
  if (lower.includes('intune') || lower.includes('endpoint')) return 'Modern Workplace / Endpoint Manager'
  if (lower.includes('azure') || lower.includes('infrastructure')) return 'Infrastructure & Cloud Manager'
  if (lower.includes('support') || lower.includes('service desk') || lower.includes('helpdesk')) return 'IT Support / Service Delivery Manager'
  if (lower.includes('erp') || lower.includes('crm') || lower.includes('power bi')) return 'Business Applications Manager'
  return 'IT Manager'
}

function analyze(text, targetRole, profileUrl) {
  const hasProfileText = text.trim().length >= 120
  const role = clean(targetRole) || detectRole(text)
  const normalizedUrl = normalizeProfileUrl(profileUrl)

  if (!hasProfileText) {
    return {
      mode: 'link_only',
      hasProfileText: false,
      profileUrl: normalizedUrl,
      role,
      score: null,
      checklist: [
        'Paste your current headline so Joblytics can rewrite it for recruiter search.',
        'Paste your About section so Joblytics can improve positioning and clarity.',
        'Paste 2-3 Experience entries so Joblytics can detect weak bullets and missing keywords.',
        'Paste your Skills section or top tools to identify missing recruiter keywords.'
      ]
    }
  }

  const firstLine = lines(text)[0] || 'No headline detected'
  const missing = KEYWORDS.filter(word => !has(text, word)).slice(0, 8)
  let score = 25
  if (text.length > 500) score += 18
  if (text.length > 1200) score += 10
  if (/\d+/.test(text)) score += 12
  if (['managed', 'led', 'responsible', 'coordinated', 'piloté', 'dirigé'].some(word => has(text, word))) score += 12
  if (['sla', 'kpi', 'itil', 'intune', 'azure', 'microsoft 365'].some(word => has(text, word))) score += 23
  score = Math.max(0, Math.min(100, score))

  return {
    mode: 'full_analysis',
    score,
    firstLine,
    role,
    profileUrl: normalizedUrl,
    hasProfileText: true,
    headline: `${role} | Microsoft 365, Intune, ITIL, SLA/KPI, Endpoint Security & Service Delivery`,
    about: `I help organizations improve IT operations, workplace services and user support through reliable service delivery, clear processes and measurable outcomes. My experience covers Microsoft 365, endpoint management, support operations, stakeholder coordination and continuous improvement, with a focus on SLA/KPI performance and practical business impact.`,
    missing,
    bullets: [
      'Led IT support and workplace operations with a focus on service quality, SLA follow-up and user experience.',
      'Managed Microsoft 365, endpoint/device workflows and support processes to improve reliability and operational visibility.',
      'Coordinated stakeholders, vendors and internal teams to resolve incidents, improve processes and deliver business-critical IT services.',
      'Used metrics, ticket trends and feedback loops to identify recurring issues and drive continuous improvement.'
    ]
  }
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className="profileOpt-copy" onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? 'Copied ✓' : label}</button>
}

export default function ProfileOptimizerPage() {
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const result = useMemo(() => submitted ? analyze(text, targetRole, profileUrl) : null, [submitted, text, targetRole, profileUrl])
  const hasEnoughProfileText = text.trim().length >= 120
  const hasProfileUrl = normalizeProfileUrl(profileUrl).includes('linkedin.com/')
  const canAnalyze = hasEnoughProfileText || hasProfileUrl
  const validProfileUrl = isValidProfileUrl(profileUrl)
  const scoreLabel = result ? (result.hasProfileText ? `${result.score}%` : 'Ready') : 'Profile'
  const scoreCaption = result ? (result.hasProfileText ? 'optimization score' : 'link saved') : 'copy-paste optimizer'

  const handleProfileTextChange = e => {
    const value = e.target.value
    if (looksLikeLinkedInUrl(value) && value.trim().split(/\s+/).length <= 2) {
      setProfileUrl(normalizeProfileUrl(value))
      setText('')
      setSubmitted(false)
      return
    }
    setText(value)
    setSubmitted(false)
  }

  return (
    <div className="profileOpt-page">
      <main className="profileOpt-shell">
        <section className="profileOpt-hero">
          <div>
            <p className="profileOpt-kicker">LinkedIn Profile</p>
            <h1>Improve your profile for recruiters.</h1>
            <p>Paste your profile link, headline, About section, experience and skills. Joblytics will suggest stronger text you can review and copy back into your profile.</p>
          </div>
          <div className="profileOpt-score"><strong>{scoreLabel}</strong><span>{scoreCaption}</span></div>
        </section>

        <section className="profileOpt-grid">
          <article className="profileOpt-card">
            <label>LinkedIn profile link<input value={profileUrl} onChange={e => { setProfileUrl(e.target.value); setSubmitted(false) }} onBlur={() => setProfileUrl(value => normalizeProfileUrl(value))} placeholder="https://www.linkedin.com/in/your-profile" /></label>
            {profileUrl.trim() && !validProfileUrl && <p className="profileOpt-warning">Add a valid LinkedIn profile link, for example https://www.linkedin.com/in/your-name.</p>}
            <label>Target role<input value={targetRole} onChange={e => { setTargetRole(e.target.value); setSubmitted(false) }} placeholder="Example: IT Support Manager" /></label>
            <label>Profile text<textarea value={text} onChange={handleProfileTextChange} rows={14} placeholder="Paste your headline, About section, Experience and Skills here..." /></label>
            {text.trim().length > 0 && !hasEnoughProfileText && <p className="profileOpt-warning">Paste at least 120 characters, or use the LinkedIn profile link field above.</p>}
            {hasProfileUrl && !hasEnoughProfileText && <p className="profileOpt-warning">Profile link detected. Analyze is active, but paste your About and Experience text for real optimization results.</p>}
            <button type="button" className="profileOpt-primary" disabled={!canAnalyze || !validProfileUrl} onClick={() => setSubmitted(true)}>{hasEnoughProfileText ? 'Analyze profile' : 'Check profile link'}</button>
          </article>

          <aside className="profileOpt-card profileOpt-help">
            <p className="profileOpt-kicker">What it improves</p>
            <h2>Profile sections</h2>
            <ul><li>Profile link reference</li><li>Headline</li><li>About section</li><li>Experience bullets</li><li>Recruiter keywords</li></ul>
            <p>This does not connect to LinkedIn directly. The link activates a preliminary check; pasted text gives the full optimization.</p>
          </aside>
        </section>

        {result && <section className="profileOpt-results">
          {result.profileUrl && <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">Profile link</p><h2>LinkedIn reference saved</h2></div><CopyButton value={result.profileUrl} /></div><p className="profileOpt-block">{result.profileUrl}</p></article>}

          {!result.hasProfileText && <article className="profileOpt-card"><p className="profileOpt-kicker">Next step</p><h2>Paste profile text to unlock full analysis</h2><p className="profileOpt-block">A LinkedIn link alone cannot expose your profile content. Paste your headline, About section, Experience and Skills to get precise rewrite suggestions.</p><div className="profileOpt-bullets">{result.checklist.map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>}

          {result.hasProfileText && <>
            <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">Headline</p><h2>Better headline</h2></div><CopyButton value={result.headline} /></div><div className="profileOpt-beforeAfter"><div><span>Current</span><p>{result.firstLine}</p></div><div><span>Improved</span><p>{result.headline}</p></div></div></article>
            <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">About</p><h2>Improved About section</h2></div><CopyButton value={result.about} /></div><p className="profileOpt-block">{result.about}</p></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Keywords</p><h2>Missing keywords to add</h2><div className="profileOpt-tags">{result.missing.map(word => <span key={word}>{word}</span>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Experience</p><h2>Bullet upgrades</h2><div className="profileOpt-bullets">{result.bullets.map((bullet, index) => <div key={bullet} className="profileOpt-bullet"><span>{index + 1}</span><p>{bullet}</p><CopyButton value={bullet} label="Copy" /></div>)}</div></article>
          </>}
        </section>}
      </main>
    </div>
  )
}
