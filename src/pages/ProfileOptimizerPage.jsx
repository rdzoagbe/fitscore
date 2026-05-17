import React, { useState } from 'react'
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

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" className="profileOpt-copy" onClick={() => { navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>{copied ? 'Copied ✓' : label}</button>
}

export default function ProfileOptimizerPage() {
  const [text, setText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checklist, setChecklist] = useState(null)

  const hasEnoughProfileText = text.trim().length >= 120
  const hasProfileUrl = normalizeProfileUrl(profileUrl).includes('linkedin.com/')
  const canAnalyze = hasEnoughProfileText || hasProfileUrl
  const validProfileUrl = isValidProfileUrl(profileUrl)
  const scoreLabel = loading ? 'AI' : result?.score !== undefined ? `${result.score}%` : hasProfileUrl && !hasEnoughProfileText ? 'Ready' : 'Profile'
  const scoreCaption = loading ? 'analyzing profile' : result?.score !== undefined ? 'optimization score' : hasProfileUrl && !hasEnoughProfileText ? 'link saved' : 'AI optimizer'

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

    if (!validProfileUrl) {
      setError('Add a valid LinkedIn profile link, for example https://www.linkedin.com/in/your-name.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileText: text, targetRole, profileUrl: normalizeProfileUrl(profileUrl) })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.code === 'PROFILE_TEXT_REQUIRED') {
          setChecklist(data.checklist || [])
          setResult({ profile_url: data.profileUrl || normalizeProfileUrl(profileUrl), target_role: clean(targetRole) || 'Target role not specified' })
          return
        }
        throw new Error(data?.error || `Server error ${res.status}`)
      }
      setResult(data.analysis)
    } catch (e) {
      setError(e.message || 'Profile optimization failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="profileOpt-page">
      <main className="profileOpt-shell">
        <section className="profileOpt-hero">
          <div>
            <p className="profileOpt-kicker">LinkedIn Profile</p>
            <h1>Improve your profile for recruiters.</h1>
            <p>Paste your LinkedIn profile text and target role. Joblytics AI will analyze your positioning and generate stronger copy based on your real experience.</p>
          </div>
          <div className="profileOpt-score"><strong>{scoreLabel}</strong><span>{scoreCaption}</span></div>
        </section>

        <section className="profileOpt-grid">
          <article className="profileOpt-card">
            <label>LinkedIn profile link<input value={profileUrl} onChange={e => { setProfileUrl(e.target.value); setResult(null); setChecklist(null); setError('') }} onBlur={() => setProfileUrl(value => normalizeProfileUrl(value))} placeholder="https://www.linkedin.com/in/your-profile" /></label>
            {profileUrl.trim() && !validProfileUrl && <p className="profileOpt-warning">Add a valid LinkedIn profile link, for example https://www.linkedin.com/in/your-name.</p>}
            <label>Target role<input value={targetRole} onChange={e => { setTargetRole(e.target.value); setResult(null); setChecklist(null); setError('') }} placeholder="Example: IT Support Manager" /></label>
            <label>Profile text<textarea value={text} onChange={handleProfileTextChange} rows={14} placeholder="Paste your LinkedIn headline, About section, Experience and Skills here..." /></label>
            {text.trim().length > 0 && !hasEnoughProfileText && <p className="profileOpt-warning">Paste at least 120 characters, or use the LinkedIn profile link field as a reference.</p>}
            {hasProfileUrl && !hasEnoughProfileText && <p className="profileOpt-warning">Profile link detected. AI analysis needs pasted profile text because LinkedIn pages cannot reliably be read from a link alone.</p>}
            {error && <p className="profileOpt-warning">{error}</p>}
            <button type="button" className="profileOpt-primary" disabled={!canAnalyze || !validProfileUrl || loading} onClick={runAnalysis}>{loading ? 'Analyzing with AI...' : hasEnoughProfileText ? 'Analyze profile with AI' : 'Check profile link'}</button>
          </article>

          <aside className="profileOpt-card profileOpt-help">
            <p className="profileOpt-kicker">What it improves</p>
            <h2>Profile sections</h2>
            <ul><li>Role positioning</li><li>Headline</li><li>About section</li><li>Experience bullets</li><li>Recruiter keywords</li><li>Evidence gaps</li></ul>
            <p>The link is a reference. The AI uses the pasted profile text to avoid inventing experience or reading inaccessible profile content.</p>
          </aside>
        </section>

        {result && <section className="profileOpt-results">
          {result.profile_url && <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">Profile link</p><h2>LinkedIn reference saved</h2></div><CopyButton value={result.profile_url} /></div><p className="profileOpt-block">{result.profile_url}</p></article>}

          {checklist && <article className="profileOpt-card"><p className="profileOpt-kicker">Next step</p><h2>Paste profile text to run AI analysis</h2><p className="profileOpt-block">A LinkedIn link alone cannot expose the full profile content. Paste the sections below so the AI can improve the profile based on real experience.</p><div className="profileOpt-bullets">{checklist.map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>}

          {!checklist && <>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Positioning</p><h2>Role alignment</h2><p className="profileOpt-block">{result.role_alignment}</p><p className="profileOpt-block">{result.current_positioning}</p></article>
            <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">Headline</p><h2>AI-improved headline</h2></div><CopyButton value={result.improved_headline} /></div><p className="profileOpt-block">{result.improved_headline}</p></article>
            <article className="profileOpt-card"><div className="profileOpt-head"><div><p className="profileOpt-kicker">About</p><h2>AI-improved About section</h2></div><CopyButton value={result.improved_about} /></div><p className="profileOpt-block">{result.improved_about}</p></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Keywords</p><h2>Recruiter keywords to add</h2><div className="profileOpt-tags">{(result.keyword_gaps || []).map(word => <span key={word}>{word}</span>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Experience</p><h2>AI bullet upgrades</h2><div className="profileOpt-bullets">{(result.experience_bullets || []).map((bullet, index) => <div key={bullet} className="profileOpt-bullet"><span>{index + 1}</span><p>{bullet}</p><CopyButton value={bullet} label="Copy" /></div>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Priority fixes</p><h2>What to improve first</h2><div className="profileOpt-bullets">{(result.priority_fixes || []).map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>
            <article className="profileOpt-card"><p className="profileOpt-kicker">Proof needed</p><h2>Evidence to add</h2><div className="profileOpt-bullets">{(result.proof_needed || []).map((item, index) => <div key={item} className="profileOpt-bullet"><span>{index + 1}</span><p>{item}</p></div>)}</div></article>
          </>}
        </section>}
      </main>
    </div>
  )
}
