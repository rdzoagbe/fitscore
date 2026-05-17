import React, { useMemo, useState } from 'react'
import './ProfileOptimizerPage.css'

const KEYWORDS = ['Microsoft 365', 'Intune', 'Azure', 'ITIL', 'SLA', 'KPI', 'endpoint security', 'service delivery', 'team leadership', 'PowerShell']

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const lines = value => String(value || '').split('\n').map(clean).filter(Boolean)

function has(text, term) {
  return text.toLowerCase().includes(term.toLowerCase())
}

function detectRole(text) {
  const lower = text.toLowerCase()
  if (lower.includes('intune') || lower.includes('endpoint')) return 'Modern Workplace / Endpoint Manager'
  if (lower.includes('azure') || lower.includes('infrastructure')) return 'Infrastructure & Cloud Manager'
  if (lower.includes('support') || lower.includes('service desk') || lower.includes('helpdesk')) return 'IT Support / Service Delivery Manager'
  if (lower.includes('erp') || lower.includes('crm') || lower.includes('power bi')) return 'Business Applications Manager'
  return 'IT Manager'
}

function analyze(text, targetRole) {
  const role = clean(targetRole) || detectRole(text)
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
    score,
    firstLine,
    role,
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
  const [submitted, setSubmitted] = useState(false)
  const result = useMemo(() => submitted ? analyze(text, targetRole) : null, [submitted, text, targetRole])
  const canAnalyze = text.trim().length >= 120

  return (
    <div className="profileOpt-page">
      <main className="profileOpt-shell">
        <section className="profileOpt-hero">
          <div>
            <p className="profileOpt-kicker">LinkedIn Profile</p>
            <h1>Improve your profile for recruiters.</h1>
            <p>Paste your headline, About section, experience and skills. Joblytics will suggest stronger text you can review and copy back into your profile.</p>
          </div>
          <div className="profileOpt-score"><strong>{result ? `${result.score}%` : 'Profile'}</strong><span>{result ? 'optimization score' : 'copy-paste optimizer'}</span></div>
        </section>

        <section className="profileOpt-grid">
          <article className="profileOpt-card">
            <label>Target role<input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="Example: IT Support Manager" /></label>
            <label>Profile text<textarea value={text} onChange={e => { setText(e.target.value); setSubmitted(false) }} rows={14} placeholder="Paste your headline, About section, Experience and Skills here..." /></label>
            {text.trim().length > 0 && !canAnalyze && <p className="profileOpt-warning">Paste at least 120 characters.</p>}
            <button type="button" className="profileOpt-primary" disabled={!canAnalyze} onClick={() => setSubmitted(true)}>Analyze profile</button>
          </article>

          <aside className="profileOpt-card profileOpt-help">
            <p className="profileOpt-kicker">What it improves</p>
            <h2>Profile sections</h2>
            <ul><li>Headline</li><li>About section</li><li>Experience bullets</li><li>Recruiter keywords</li></ul>
            <p>This does not connect to LinkedIn directly. It generates copy-paste improvements.</p>
          </aside>
        </section>

        {result && <section className="profileOpt-results">
          <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">Headline</p><h2>Better headline</h2></div><CopyButton value={result.headline} /></div><div className="profileOpt-beforeAfter"><div><span>Current</span><p>{result.firstLine}</p></div><div><span>Improved</span><p>{result.headline}</p></div></div></article>
          <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">About</p><h2>Improved About section</h2></div><CopyButton value={result.about} /></div><p className="profileOpt-block">{result.about}</p></article>
          <article className="profileOpt-card"><p className="profileOpt-kicker">Keywords</p><h2>Missing keywords to add</h2><div className="profileOpt-tags">{result.missing.map(word => <span key={word}>{word}</span>)}</div></article>
          <article className="profileOpt-card"><p className="profileOpt-kicker">Experience</p><h2>Bullet upgrades</h2><div className="profileOpt-bullets">{result.bullets.map((bullet, index) => <div key={bullet} className="profileOpt-bullet"><span>{index + 1}</span><p>{bullet}</p><CopyButton value={bullet} label="Copy" /></div>)}</div></article>
        </section>}
      </main>
    </div>
  )
}
