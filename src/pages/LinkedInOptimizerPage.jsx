import React, { useMemo, useState } from 'react'
import { useLang } from '../context/LangContext'

function downloadTextFile(fileName, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
    reader.readAsText(file)
  })
}

function formatReport(data) {
  const exp = data?.experience?.improvements || []
  return [
    'LinkedIn Profile Optimization Report',
    '',
    `Overall score: ${data?.overall_score ?? 0}/100`,
    data?.score_explanation || '',
    '',
    'HEADLINE',
    data?.headline?.improved_version || '',
    '',
    'ABOUT',
    data?.about?.improved_version || '',
    '',
    'EXPERIENCE',
    ...exp.flatMap(item => [
      item.role_title || 'Experience',
      ...(item.improved_bullets || []).map(bullet => `• ${bullet}`),
      ''
    ]),
    'SKILLS TO PIN',
    ...(data?.skills?.to_reorder_top_3 || []).map(skill => `• ${skill}`),
    '',
    'SKILLS TO ADD',
    ...(data?.skills?.to_add || []).map(skill => `• ${skill}`),
    '',
    'QUICK WINS',
    ...(data?.quick_wins || []).map(win => `• ${win}`),
    '',
    data?.honest_disclaimer || ''
  ].join('\n')
}

export default function LinkedInOptimizerPage() {
  const { t, lang } = useLang()
  const tr = (key, fallback) => t?.(key) || fallback

  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [profileText, setProfileText] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [optimization, setOptimization] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState({})

  const uploadValid = profileText.trim().length >= 50
  const pasteValid = headline.trim().length >= 5 || about.trim().length >= 30 || experience.trim().length >= 50
  const canSubmit = !loading && !uploadLoading && (uploadValid || pasteValid)

  const inputSummary = useMemo(() => {
    const items = []
    if (headline.trim()) items.push('headline')
    if (about.trim()) items.push('about')
    if (experience.trim()) items.push('experience')
    if (skills.trim()) items.push('skills')
    if (profileText.trim()) items.push('uploaded profile text')
    return items.join(' · ')
  }, [headline, about, experience, skills, profileText])

  async function optimize() {
    if (!canSubmit) return
    setError('')
    setLoading(true)
    setOptimization(null)

    try {
      const body = profileText.trim()
        ? { profileText: profileText.trim(), targetRole, lang }
        : { headline, about, experience, skills, targetRole, lang }

      const response = await fetch('/api/linkedin-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server error ${response.status}`)
      }

      setOptimization(data.optimization)
      window.setTimeout(() => {
        document.getElementById('linkedin-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(err.message || tr('linkedin_error', 'Could not analyze profile. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setUploadLoading(true)
    setProfileText('')
    setUploadName(file.name)

    try {
      if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        const text = await readTextFile(file)
        if (text.trim().length < 50) throw new Error('This text file does not contain enough profile content.')
        setProfileText(text.slice(0, 12000))
        return
      }

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Please upload a PDF or .txt export, or paste the sections manually.')
      }

      const base64 = await fileToBase64(file)
      const response = await fetch('/api/linkedin-pdf-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, fileName: file.name })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not extract text from this PDF.')

      setProfileText(data.text)
    } catch (err) {
      setError(err.message || 'Could not process this file. Please use paste mode.')
      setProfileText('')
    } finally {
      setUploadLoading(false)
    }
  }

  async function copyToClipboard(text, key) {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(prev => ({ ...prev, [key]: true }))
    window.setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 1500)
  }

  function downloadReport() {
    if (!optimization) return
    downloadTextFile('linkedin-profile-optimization.txt', formatReport(optimization))
  }

  function downloadJson() {
    if (!optimization) return
    downloadTextFile('linkedin-profile-optimization.json', JSON.stringify(optimization, null, 2), 'application/json;charset=utf-8')
  }

  function clearUpload() {
    setProfileText('')
    setUploadName('')
  }

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(18px,4vw,34px)' }}>
      <section style={{ marginBottom: 22 }}>
        <p style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          🔗 LinkedIn optimizer
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(30px,5vw,56px)', lineHeight: 1.02, color: 'var(--text-primary)', marginBottom: 12 }}>
          Make your LinkedIn profile recruiter-ready.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(15px,2vw,18px)', lineHeight: 1.7, maxWidth: 780 }}>
          Paste your headline, About section, experience and skills. Joblytics does not ask for your LinkedIn password and does not scrape private LinkedIn pages.
        </p>
      </section>

      <section style={{ ...cardStyle, marginBottom: 18, borderColor: 'rgba(74,144,226,0.25)' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Privacy-first mode</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          For reliability and trust, URL-based LinkedIn reading, LinkedIn login, and automated scraping are disabled. Use paste mode or upload a profile export/PDF.
        </p>
      </section>

      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <TextInput
          label={tr('target_role', 'Target role')}
          hint={tr('optional', 'optional')}
          value={targetRole}
          onChange={setTargetRole}
          placeholder="IT Manager, Service Delivery Manager, Cloud Infrastructure Lead..."
          disabled={loading}
        />

        <div style={{ marginBottom: 18, padding: 14, border: '1px dashed var(--border)', borderRadius: 14, background: 'var(--bg-input)' }}>
          <FieldLabel label="Upload profile export" optional="optional" />
          <input type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={handleProfileUpload} disabled={loading || uploadLoading} style={{ width: '100%', fontSize: 13 }} />
          <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 8, lineHeight: 1.5 }}>
            Upload a PDF/TXT export or paste manually below. No LinkedIn login is used.
          </p>
          {uploadLoading && <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>Extracting profile text...</p>}
          {profileText && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loaded: {uploadName || 'profile text'} · {profileText.length} chars</span>
              <button type="button" onClick={clearUpload} style={secondaryButtonStyle}>Remove upload</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
          <TextInput
            label={tr('linkedin_section_headline', 'Headline')}
            value={headline}
            onChange={setHeadline}
            placeholder="Senior IT Manager | Workplace, Cloud & Service Delivery"
            disabled={loading || !!profileText}
          />
          <TextInput
            label={tr('linkedin_section_skills', 'Skills')}
            hint={tr('optional', 'optional')}
            value={skills}
            onChange={setSkills}
            placeholder="Intune, ITIL, Jira, Leadership, Azure..."
            disabled={loading || !!profileText}
          />
        </div>

        <TextareaInput
          label={tr('linkedin_section_about', 'About / Summary')}
          hint={`${about.length} chars`}
          value={about}
          onChange={setAbout}
          placeholder="Paste your LinkedIn About section here."
          rows={6}
          maxLength={3000}
          disabled={loading || !!profileText}
        />

        <TextareaInput
          label={tr('linkedin_section_experience', 'Experience')}
          hint={tr('optional', 'optional')}
          value={experience}
          onChange={setExperience}
          placeholder="Paste your most recent 1-3 experience entries."
          rows={6}
          maxLength={4500}
          disabled={loading || !!profileText}
        />

        {inputSummary && (
          <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: -4, marginBottom: 12 }}>
            Input ready: {inputSummary}
          </p>
        )}

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: '#ff6b6b', lineHeight: 1.5, margin: 0 }}>⚠ {error}</p>
          </div>
        )}

        <button type="button" onClick={optimize} disabled={!canSubmit} className="btn-primary" style={{ width: '100%', opacity: canSubmit ? 1 : 0.55 }}>
          {loading ? '⏳ Analyzing your profile...' : '✨ Optimize my profile →'}
        </button>

        {!canSubmit && !loading && (
          <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 8 }}>
            Paste at least a headline, About section, or experience content to start.
          </p>
        )}
      </section>

      {optimization && (
        <section id="linkedin-results" style={{ animation: 'fadeUp 0.4s ease' }}>
          {optimization.warning && (
            <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(245,166,35,0.08)', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
              ⚠ {optimization.warning}
            </div>
          )}

          <OverallScoreCard data={optimization} />
          <SectionCard title="Headline" icon="📌" section={optimization.headline} copied={copied.headline} onCopy={() => copyToClipboard(optimization.headline?.improved_version || '', 'headline')} />
          <SectionCard title="About / Summary" icon="💬" section={optimization.about} copied={copied.about} onCopy={() => copyToClipboard(optimization.about?.improved_version || '', 'about')} preserveLines />
          {!!optimization.experience?.improvements?.length && <ExperienceCard data={optimization.experience} copied={copied} onCopy={copyToClipboard} />}
          {optimization.skills && <SkillsCard data={optimization.skills} />}
          {!!optimization.quick_wins?.length && <QuickWinsCard wins={optimization.quick_wins} />}

          <div style={{ ...cardStyle, marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>⬇️ Download your optimized profile</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>Download a plain-text report or JSON for review.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
              <button type="button" onClick={downloadReport} className="btn-primary">⬇ Download .txt</button>
              <button type="button" onClick={downloadJson} style={secondaryButtonStyle}>⬇ Download .json</button>
            </div>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 30 }}>
            ℹ️ {optimization.honest_disclaimer || 'Review carefully before publishing. AI optimizes wording but does not verify facts.'}
          </p>
        </section>
      )}
    </main>
  )
}

function FieldLabel({ label, optional }) {
  return (
    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
      {label} {optional && <span style={{ textTransform: 'none', color: 'var(--text-hint)', fontWeight: 400 }}>· {optional}</span>}
    </label>
  )
}

function TextInput({ label, hint, value, onChange, placeholder, disabled }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel label={label} optional={hint} />
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} style={{ fontSize: 14, width: '100%' }} />
    </div>
  )
}

function TextareaInput({ label, hint, value, onChange, placeholder, rows, maxLength, disabled }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel label={label} optional={hint} />
      <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} rows={rows} maxLength={maxLength} disabled={disabled} style={{ fontSize: 13, resize: 'vertical', width: '100%' }} />
    </div>
  )
}

function OverallScoreCard({ data }) {
  const score = data.overall_score || 0
  const color = score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff6b6b'
  return (
    <div style={cardStyle}>
      <p style={kickerStyle}>📊 Overall profile score</p>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 700, color, lineHeight: 1, marginBottom: 12 }}>
        {score}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span>
      </p>
      {data.score_explanation && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.score_explanation}</p>}
    </div>
  )
}

function SectionCard({ title, icon, section, copied, onCopy, preserveLines }) {
  if (!section?.improved_version) return null
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{icon} {title}</p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>{section.current_score}/10</span>
          <span style={{ color: 'var(--accent)' }}>→</span>
          <span style={{ color: '#4caf7d', fontWeight: 700 }}>{section.improved_score}/10</span>
        </div>
      </div>
      {!!section.issues?.length && <Issues issues={section.issues} />}
      <p style={{ fontSize: 10, fontWeight: 700, color: '#4caf7d', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>✨ Improved version — copy-paste ready</p>
      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: preserveLines ? 'pre-wrap' : 'normal', wordBreak: 'break-word' }}>{section.improved_version}</p>
      </div>
      <button type="button" onClick={onCopy} style={secondaryButtonStyle}>{copied ? '✓ Copied' : 'Copy'}</button>
      {section.why_better && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 10 }}>Why better: {section.why_better}</p>}
    </div>
  )
}

function ExperienceCard({ data, copied, onCopy }) {
  return (
    <div style={cardStyle}>
      <p style={kickerStyle}>💼 Experience improvements</p>
      {!!data.issues?.length && <Issues issues={data.issues} />}
      {data.improvements.map((item, index) => (
        <div key={`${item.role_title}-${index}`} style={{ marginTop: 12, paddingTop: 12, borderTop: index ? '1px solid var(--border)' : 'none' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{item.role_title}</p>
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
            {(item.improved_bullets || []).map((bullet, bulletIndex) => <p key={bulletIndex} style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 6 }}>• {bullet}</p>)}
          </div>
          <button type="button" onClick={() => onCopy((item.improved_bullets || []).map(b => `• ${b}`).join('\n'), `exp-${index}`)} style={secondaryButtonStyle}>
            {copied[`exp-${index}`] ? '✓ Copied' : 'Copy bullets'}
          </button>
        </div>
      ))}
      {data.general_advice && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12 }}>{data.general_advice}</p>}
    </div>
  )
}

function SkillsCard({ data }) {
  const group = (title, items) => !!items?.length && (
    <div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{title}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => <span key={item} style={pillStyle}>{item}</span>)}
      </div>
    </div>
  )
  return (
    <div style={cardStyle}>
      <p style={kickerStyle}>🧩 Skills strategy</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        {group('Pin these top 3', data.to_reorder_top_3)}
        {group('Consider adding', data.to_add)}
        {group('Consider removing', data.to_remove)}
      </div>
      {data.rationale && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12 }}>{data.rationale}</p>}
    </div>
  )
}

function QuickWinsCard({ wins }) {
  return (
    <div style={cardStyle}>
      <p style={kickerStyle}>⚡ Quick wins</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {wins.map(win => <li key={win} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 6 }}>{win}</li>)}
      </ul>
    </div>
  )
}

function Issues({ issues }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {issues.map(issue => <p key={issue} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>• {issue}</p>)}
    </div>
  )
}

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 'clamp(16px,3vw,24px)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  marginBottom: 18
}

const kickerStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 12,
  fontFamily: 'Syne, sans-serif'
}

const secondaryButtonStyle = {
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  borderRadius: 10,
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12
}

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 600
}
