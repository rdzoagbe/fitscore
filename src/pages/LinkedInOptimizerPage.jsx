import React, { useEffect, useMemo, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch (_) {
    return value
  }
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
  const { user } = useAuth()
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
  const [savedItems, setSavedItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [activeSavedId, setActiveSavedId] = useState(null)

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

  const profileInput = useMemo(() => ({
    mode: profileText.trim() ? 'upload' : 'paste',
    targetRole: targetRole.trim(),
    headline: headline.trim(),
    about: about.trim(),
    experience: experience.trim(),
    skills: skills.trim(),
    profileText: profileText.trim() ? profileText.trim().slice(0, 12000) : '',
    uploadName: uploadName || ''
  }), [headline, about, experience, skills, targetRole, profileText, uploadName])

  useEffect(() => {
    loadSavedOptimizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function loadSavedOptimizations() {
    if (!user?.id) {
      setSavedItems([])
      return
    }

    setHistoryLoading(true)
    try {
      const { data, error: historyError } = await supabase
        .from('linkedin_optimizations')
        .select('id,target_role,score,result_json,profile_input,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8)

      if (historyError) throw historyError
      setSavedItems(data || [])
    } catch (err) {
      console.warn('Could not load LinkedIn optimization history:', err.message)
      setSavedItems([])
    } finally {
      setHistoryLoading(false)
    }
  }

  function markLinkedInProgress(record = {}) {
    try {
      window.localStorage.setItem('joblytics_linkedin_optimization_saved', JSON.stringify({
        savedAt: new Date().toISOString(),
        targetRole: record.target_role || targetRole || '',
        score: record.score || optimization?.overall_score || 0,
        id: record.id || null
      }))
    } catch (_) {
      // localStorage is only used to help the dashboard progress card; ignore failures.
    }
  }

  async function optimize() {
    if (!canSubmit) return
    setError('')
    setSaveError('')
    setSaveMessage('')
    setActiveSavedId(null)
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
      try {
        window.localStorage.setItem('joblytics_linkedin_latest_optimization', JSON.stringify({
          optimizedAt: new Date().toISOString(),
          targetRole,
          score: data.optimization?.overall_score || 0
        }))
      } catch (_) {}

      window.setTimeout(() => {
        document.getElementById('linkedin-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(err.message || tr('linkedin_error', 'Could not analyze profile. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function saveOptimization() {
    if (!optimization) return
    setSaveError('')
    setSaveMessage('')

    if (!user?.id) {
      setSaveError('Sign in to save this optimization to your history.')
      return
    }

    setSaveLoading(true)
    try {
      const score = Number(optimization?.overall_score || 0)
      const { data, error: saveErr } = await supabase
        .from('linkedin_optimizations')
        .insert({
          user_id: user.id,
          target_role: targetRole.trim() || profileInput.targetRole || 'LinkedIn profile',
          profile_input: profileInput,
          result_json: optimization,
          score
        })
        .select('id,target_role,score,result_json,profile_input,created_at')
        .single()

      if (saveErr) throw saveErr

      setActiveSavedId(data.id)
      setSavedItems(prev => [data, ...prev.filter(item => item.id !== data.id)].slice(0, 8))
      markLinkedInProgress(data)
      setSaveMessage('Saved to LinkedIn history.')
    } catch (err) {
      setSaveError(err.message || 'Could not save this optimization.')
    } finally {
      setSaveLoading(false)
    }
  }

  async function deleteSavedOptimization(id) {
    if (!user?.id || !id) return
    try {
      const { error: deleteErr } = await supabase
        .from('linkedin_optimizations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteErr) throw deleteErr
      setSavedItems(prev => prev.filter(item => item.id !== id))
      if (activeSavedId === id) setActiveSavedId(null)
    } catch (err) {
      setSaveError(err.message || 'Could not delete this saved optimization.')
    }
  }

  function openSavedOptimization(item) {
    if (!item?.result_json) return
    setOptimization(item.result_json)
    setActiveSavedId(item.id)
    setTargetRole(item.target_role || item.profile_input?.targetRole || '')
    setSaveError('')
    setSaveMessage('Loaded saved optimization.')
    window.setTimeout(() => {
      document.getElementById('linkedin-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
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

        {error && <Alert tone="error">⚠ {error}</Alert>}

        <button type="button" onClick={optimize} disabled={!canSubmit} className="btn-primary" style={{ width: '100%', opacity: canSubmit ? 1 : 0.55 }}>
          {loading ? '⏳ Analyzing your profile...' : '✨ Optimize my profile →'}
        </button>

        {!canSubmit && !loading && (
          <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 8 }}>
            Paste at least a headline, About section, or experience content to start.
          </p>
        )}
      </section>

      <LinkedInHistoryCard
        user={user}
        items={savedItems}
        loading={historyLoading}
        onOpen={openSavedOptimization}
        onDelete={deleteSavedOptimization}
        activeSavedId={activeSavedId}
      />

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
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>Save and export</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              Save this optimization to your account history, or download a local copy.
            </p>

            {saveMessage && <Alert tone="success">✓ {saveMessage}</Alert>}
            {saveError && <Alert tone="error">⚠ {saveError}</Alert>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 8 }}>
              <button type="button" onClick={saveOptimization} disabled={saveLoading} className="btn-primary">
                {saveLoading ? 'Saving...' : activeSavedId ? '✓ Saved' : '💾 Save to my career history'}
              </button>
              <button type="button" onClick={downloadReport} style={secondaryButtonStyle}>⬇ Download .txt</button>
              <button type="button" onClick={downloadJson} style={secondaryButtonStyle}>⬇ Download .json</button>
            </div>
            {!user && (
              <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 10 }}>
                Sign in to keep LinkedIn optimizations in your Joblytics history.
              </p>
            )}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 30 }}>
            ℹ️ {optimization.honest_disclaimer || 'Review carefully before publishing. AI optimizes wording but does not verify facts.'}
          </p>
        </section>
      )}
    </main>
  )
}

function Alert({ children, tone }) {
  const isSuccess = tone === 'success'
  return (
    <div style={{ marginBottom: 14, padding: '10px 12px', background: isSuccess ? 'rgba(76,175,125,0.08)' : 'rgba(255,107,107,0.08)', border: `1px solid ${isSuccess ? 'rgba(76,175,125,0.25)' : 'rgba(255,107,107,0.25)'}`, borderRadius: 10 }}>
      <p style={{ fontSize: 12, color: isSuccess ? '#4caf7d' : '#ff6b6b', lineHeight: 1.5, margin: 0 }}>{children}</p>
    </div>
  )
}

function LinkedInHistoryCard({ user, items, loading, onOpen, onDelete, activeSavedId }) {
  return (
    <section style={{ ...cardStyle, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <p style={kickerStyle}>🗂 LinkedIn history</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Saved optimizations stay available so users can compare profile versions and export them again later.
          </p>
        </div>
        <span style={pillStyle}>{user ? `${items.length} saved` : 'Sign in required'}</span>
      </div>

      {!user && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Sign in to save LinkedIn optimization results to your account history.
        </p>
      )}

      {user && loading && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading saved optimizations...</p>}

      {user && !loading && !items.length && (
        <div style={{ padding: 14, borderRadius: 14, background: 'var(--bg-input)', border: '1px dashed var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 4 }}>No saved LinkedIn optimizations yet.</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>Run an optimization, then click “Save to my career history”.</p>
        </div>
      )}

      {user && !!items.length && (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 14, padding: 12, background: activeSavedId === item.id ? 'rgba(74,144,226,0.08)' : 'var(--bg-input)' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.target_role || 'LinkedIn profile'} · {item.score || item.result_json?.overall_score || 0}/100
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0 }}>{formatDate(item.created_at)}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => onOpen(item)} style={secondaryButtonStyle}>Open</button>
                <button type="button" onClick={() => onDelete(item.id)} style={{ ...secondaryButtonStyle, color: '#ff6b6b' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
