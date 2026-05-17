import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUserProfile } from '../hooks/useUserProfile'
import OptimizeCvCard from '../components/OptimizeCvCard'
import CvVersionVault from '../components/CvVersionVault'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import './CvCoachPage.css'

const scoreColor = score => score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff6b6b'
const jobTitle = (item, t) => item?.result?.job_context?.title || item?.job_title || t('job_analysis')
const companyName = item => {
  const company = item?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

const formatDateTime = value => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch (_) {
    return String(value).slice(0, 10)
  }
}

const getAnalysisCompany = analysis => companyName(analysis) || analysis?.result?.job_context?.company || ''
const getAnalysisJobTitle = (analysis, t) => jobTitle(analysis, t)


function CopyButton({ value, children, t }) {
  const [copied, setCopied] = useState(false)
  const [savedLetters, setSavedLetters] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [historyError, setHistoryError] = useState('')
  return (
    <button
      type="button"
      className={`coachPro-copy ${copied ? 'is-copied' : ''}`}
      onClick={() => {
        navigator.clipboard.writeText(value || '')
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
    >
      {copied ? `✓ ${t('copied')}` : children || t('copy')}
    </button>
  )
}

function QuickWin({ item, index, t }) {
  const tip = typeof item === 'string' ? item : item?.tip || ''
  const example = typeof item === 'object' ? item?.example : null
  return (
    <article className="coachPro-quickWin">
      <div className="coachPro-quickHead">
        <span>{index + 1}</span>
        <strong>{tip}</strong>
        {!example && <CopyButton value={tip} t={t}>📋</CopyButton>}
      </div>
      {example && (
        <div className="coachPro-example">
          <small>{t('example')}</small>
          <p>“{example}”</p>
          <CopyButton value={example} t={t}>📋 {t('copy')}</CopyButton>
        </div>
      )}
    </article>
  )
}

function Keyword({ word, t }) {
  return <CopyButton value={word} t={t}>+ {word}</CopyButton>
}

function InsightSection({ label, title, tone, children }) {
  return (
    <section className={`coachPro-section coachPro-section--${tone || 'default'}`}>
      <p className="coachPro-kicker">{label}</p>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function AnalysisCoach({ analysis, t }) {
  const result = analysis?.result
  if (!result) return null
  const quickWins = result.quick_wins || []
  const missing = result.keyword_match?.missing_required || []
  const edges = result.interview_prep?.your_edges || []
  const gaps = result.critical_gaps || []
  const score = Number(analysis.score || 0)
  const color = scoreColor(score)

  return (
    <article className="coachPro-card coachPro-mainCoach">
      <header className="coachPro-cardTop">
        <div className="coachPro-score" style={{ color, borderColor: color }}>{score}%</div>
        <div>
          <p className="coachPro-kicker">{t('cv_intelligence')}</p>
          <h2>{jobTitle(analysis, t)}</h2>
          {companyName(analysis) && <span>@ {companyName(analysis)}</span>}
        </div>
      </header>

      <div className="coachPro-stack">
        {quickWins.length > 0 && (
          <InsightSection label={t('quick_wins_label')} title={t('add_to_cv')} tone="accent">
            <div className="coachPro-listGrid">
              {quickWins.map((win, index) => <QuickWin key={index} item={win} index={index} t={t} />)}
            </div>
          </InsightSection>
        )}

        {missing.length > 0 && (
          <InsightSection label={t('missing_keywords_label')} title={t('tap_copy_cv')} tone="warning">
            <div className="coachPro-keywords">
              {missing.map(word => <Keyword key={word} word={word} t={t} />)}
            </div>
          </InsightSection>
        )}

        {edges.length > 0 && (
          <InsightSection label={t('your_edges_label')} title={t('strengths_to_highlight')} tone="success">
            <div className="coachPro-bullets">
              {edges.map((edge, index) => <p key={index}>✓ {edge}</p>)}
            </div>
          </InsightSection>
        )}

        {gaps.length > 0 && (
          <InsightSection label={t('gaps_label')} title={t('address_before_applying')} tone="danger">
            <div className="coachPro-bullets">
              {gaps.map((gap, index) => <p key={index}>✗ {gap}</p>)}
            </div>
          </InsightSection>
        )}
      </div>
    </article>
  )
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function buildCvText(rewritten) {
  const c = rewritten.header?.contact || {}
  const lines = []
  lines.push(rewritten.header?.full_name || '')
  if (rewritten.header?.title) lines.push(rewritten.header.title)
  const contacts = [c.email, c.phone, c.location, c.linkedin].filter(Boolean)
  if (contacts.length) lines.push(contacts.join(' · '))
  lines.push('')
  if (rewritten.summary) {
    lines.push('PROFESSIONAL SUMMARY')
    lines.push('─'.repeat(40))
    lines.push(rewritten.summary)
    lines.push('')
  }
  if (rewritten.experience?.length) {
    lines.push('EXPERIENCE')
    lines.push('─'.repeat(40))
    rewritten.experience.forEach(exp => {
      lines.push(`${exp.title} — ${exp.company}${exp.location ? `, ${exp.location}` : ''}`)
      if (exp.dates) lines.push(exp.dates)
      ;(exp.bullets || []).forEach(b => lines.push(`• ${b}`))
      lines.push('')
    })
  }
  if (rewritten.skills) {
    lines.push('SKILLS')
    lines.push('─'.repeat(40))
    if (rewritten.skills.technical?.length) lines.push(`Technical: ${rewritten.skills.technical.join(', ')}`)
    if (rewritten.skills.soft?.length) lines.push(`Soft skills: ${rewritten.skills.soft.join(', ')}`)
    if (rewritten.skills.languages?.length) lines.push(`Languages: ${rewritten.skills.languages.join(', ')}`)
    lines.push('')
  }
  if (rewritten.education?.length) {
    lines.push('EDUCATION')
    lines.push('─'.repeat(40))
    rewritten.education.forEach(edu => {
      lines.push(`${edu.degree} — ${edu.institution}${edu.location ? `, ${edu.location}` : ''}`)
      if (edu.dates) lines.push(edu.dates)
    })
    lines.push('')
  }
  if (rewritten.certifications?.length) {
    lines.push('CERTIFICATIONS')
    lines.push('─'.repeat(40))
    rewritten.certifications.forEach(cert => lines.push(`• ${cert}`))
    lines.push('')
  }
  lines.push('─'.repeat(40))
  lines.push(rewritten.disclaimer || '')
  return lines.join('\n')
}

function CvRewriteCard({ t, lang, user }) {
  const [jobDesc, setJobDesc] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvName, setCvName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('cv')
  const fileRef = useRef(null)

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(file.type)) {
      setError('Please upload a PDF or Word document (.pdf, .doc, .docx)')
      return
    }
    setCvFile(file)
    setCvName(file.name)
    setError('')
  }

  const handleRewrite = async () => {
    if (!cvFile) { setError('Please upload your CV first.'); return }
    if (jobDesc.trim().length < 80) { setError('Please paste a full job description (at least 80 characters).'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Please sign in again.')

      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(cvFile)
      })

      const response = await fetch('/api/cv-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cvBase64: base64, cvMimeType: cvFile.type, jobDescription: jobDesc, lang })
      })

      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || 'Rewrite failed. Please try again.')
      setResult(data.rewritten)
      setActiveTab('cv')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const handleDownload = () => {
    if (!result) return
    const text = buildCvText(result)
    const name = (result.header?.full_name || 'cv').replace(/\s+/g, '-').toLowerCase()
    downloadTextFile(text, `${name}-rewritten-${Date.now()}.txt`)
  }

  return (
    <article className="coachPro-card" style={{ marginTop: 32 }}>
      <header className="coachPro-cardHeader">
        <div>
          <p className="coachPro-kicker">AI Full Rewrite</p>
          <h2>CV Tailored to Job</h2>
          <p>Upload your CV + paste a job description → get a fully rewritten CV targeted to that role.</p>
        </div>
      </header>

      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="coachPro-field">
            <div className="coachPro-fieldLabel"><span>Your CV</span></div>
            <button type="button" className={`coachPro-nameBox ${cvName ? 'has-value' : ''}`} onClick={() => fileRef.current?.click()}>
              {cvName || 'Click to upload CV (PDF or Word)'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={handleFile} />
          </div>
          <div className="coachPro-field">
            <div className="coachPro-fieldLabel"><span>Job Description</span></div>
            <textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={8}
              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
          {error && <p className="coachPro-error">⚠ {error}</p>}
          <button type="button" className="coachPro-generateBtn" onClick={handleRewrite} disabled={loading}>
            {loading ? 'Rewriting CV…' : 'Rewrite CV for this job →'}
          </button>
          {loading && (
            <div className="coachPro-generating">
              <div />
              <p>AI is fully rewriting your CV — this takes 20-30 seconds…</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {['cv', 'changes', 'keywords'].map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{
                padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12,
                background: activeTab === tab ? 'var(--accent)' : 'var(--bg-input)',
                color: activeTab === tab ? '#0f172a' : 'var(--text-muted)', fontFamily: 'inherit'
              }}>
                {tab === 'cv' ? 'Rewritten CV' : tab === 'changes' ? 'What Changed' : 'Keywords Added'}
              </button>
            ))}
            <button type="button" onClick={handleDownload} style={{ marginLeft: 'auto', padding: '6px 16px', borderRadius: 20, border: '1px solid var(--accent)', cursor: 'pointer', fontSize: 12, background: 'var(--accent-bg)', color: 'var(--accent)', fontFamily: 'inherit' }}>
              ⬇ Download .txt
            </button>
            <button type="button" onClick={() => { setResult(null); setError('') }} style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, background: 'var(--bg-input)', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
              ↺ Rewrite again
            </button>
          </div>

          {activeTab === 'cv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--text-primary)' }}>{result.header?.full_name}</h3>
                <p style={{ margin: '0 0 8px', color: 'var(--accent)', fontSize: 14, fontWeight: 500 }}>{result.header?.title}</p>
                {[result.header?.contact?.email, result.header?.contact?.phone, result.header?.contact?.location, result.header?.contact?.linkedin].filter(Boolean).map((v, i) => (
                  <span key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 12 }}>{v}</span>
                ))}
              </div>
              {result.summary && (
                <section>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Professional Summary</p>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>{result.summary}</p>
                </section>
              )}
              {result.experience?.length > 0 && (
                <section>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Experience</p>
                  {result.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{exp.title}</p>
                      <p style={{ margin: '2px 0 6px', fontSize: 12, color: 'var(--text-muted)' }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''} {exp.dates ? `· ${exp.dates}` : ''}</p>
                      {(exp.bullets || []).map((b, j) => (
                        <p key={j} style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>• {b}</p>
                      ))}
                    </div>
                  ))}
                </section>
              )}
              {(result.skills?.technical?.length > 0 || result.skills?.soft?.length > 0) && (
                <section>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Skills</p>
                  {result.skills.technical?.length > 0 && <p style={{ fontSize: 13, margin: '4px 0', color: 'var(--text-secondary)' }}><strong>Technical:</strong> {result.skills.technical.join(', ')}</p>}
                  {result.skills.soft?.length > 0 && <p style={{ fontSize: 13, margin: '4px 0', color: 'var(--text-secondary)' }}><strong>Soft skills:</strong> {result.skills.soft.join(', ')}</p>}
                  {result.skills.languages?.length > 0 && <p style={{ fontSize: 13, margin: '4px 0', color: 'var(--text-secondary)' }}><strong>Languages:</strong> {result.skills.languages.join(', ')}</p>}
                </section>
              )}
              {result.education?.length > 0 && (
                <section>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>Education</p>
                  {result.education.map((edu, i) => (
                    <p key={i} style={{ margin: '4px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <strong>{edu.degree}</strong> — {edu.institution}{edu.location ? `, ${edu.location}` : ''} {edu.dates ? `(${edu.dates})` : ''}
                    </p>
                  ))}
                </section>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-hint)', fontStyle: 'italic', marginTop: 8, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8 }}>
                ℹ {result.disclaimer}
              </p>
            </div>
          )}

          {activeTab === 'changes' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Key edits the AI made to tailor your CV to this specific role:</p>
              {(result.changes_summary || []).map((change, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 10 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, minWidth: 20 }}>{i + 1}</span>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{change}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'keywords' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Job description keywords naturally integrated into the rewritten CV:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(result.keywords_added || []).map((kw, i) => (
                  <span key={i} style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 12, fontWeight: 500 }}>{kw}</span>
                ))}
                {!result.keywords_added?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No specific keywords listed.</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function CvCoachPage() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const { fullName, saveFullName } = useUserProfile()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('standard')
  const [recipient, setRecipient] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedLetters, setSavedLetters] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [historyError, setHistoryError] = useState('')

  useEffect(() => { fetchAnalyses() }, [])

  useEffect(() => {
    if (user?.id) fetchCoverLetters()
  }, [user?.id])

  useEffect(() => {
    setRecipient(selected?.result?.job_context?.hiring_contact || '')
    setCoverLetter('')
    setGenError('')
    setSaveStatus('')
  }, [selected?.id])

  const fetchAnalyses = async () => {
    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)
    setAnalyses(data || [])
    if (data?.length) setSelected(data[0])
    setLoading(false)
  }

  const fetchCoverLetters = async () => {
    if (!user?.id) return
    setHistoryLoading(true)
    setHistoryError('')
    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) {
      setHistoryError(error.message || 'Could not load saved cover letters.')
      setSavedLetters([])
    } else {
      setSavedLetters(data || [])
    }
    setHistoryLoading(false)
  }

  const saveCoverLetter = async () => {
    if (!user?.id || !coverLetter.trim()) return
    setSaveLoading(true)
    setSaveStatus('')
    setHistoryError('')

    const payload = {
      user_id: user.id,
      analysis_id: selected?.id || null,
      job_title: getAnalysisJobTitle(selected, t),
      company: getAnalysisCompany(selected),
      recipient: recipient.trim() || null,
      tone,
      length,
      language: lang,
      letter: coverLetter.trim(),
      metadata: {
        score: selected?.score || null,
        source: 'cv_coach',
        saved_from: 'cover_letter_generator'
      }
    }

    const { error } = await supabase
      .from('cover_letters')
      .insert(payload)

    if (error) {
      setSaveStatus(`⚠ ${error.message || 'Could not save cover letter.'}`)
    } else {
      setSaveStatus('✅ Saved to history')
      try {
        window.localStorage.setItem('joblytics_cover_letter_history_signal', JSON.stringify({ savedAt: new Date().toISOString(), jobTitle: payload.job_title }))
      } catch (_) {}
      await fetchCoverLetters()
    }
    setSaveLoading(false)
  }

  const loadSavedCoverLetter = saved => {
    if (!saved) return
    setCoverLetter(saved.letter || '')
    setRecipient(saved.recipient || '')
    setTone(saved.tone || 'professional')
    setLength(saved.length || 'standard')
    setSaveStatus('Loaded from history')
    if (saved.analysis_id) {
      const linked = analyses.find(item => item.id === saved.analysis_id)
      if (linked) setSelected(linked)
    }
  }

  const deleteSavedCoverLetter = async id => {
    if (!id) return
    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      setHistoryError(error.message || 'Could not delete cover letter.')
    } else {
      setSavedLetters(current => current.filter(item => item.id !== id))
    }
  }

  const downloadCoverLetter = () => {
    if (!coverLetter.trim()) return
    const blob = new Blob([coverLetter], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `joblytics-cover-letter-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const generateCoverLetter = async () => {
    if (!selected?.result) return
    setGenLoading(true)
    setCoverLetter('')
    setGenError('')

    try {
      let nameToUse = fullName
      if (!nameToUse && tempName.trim()) {
        const saved = await saveFullName(tempName.trim())
        if (!saved?.success) throw new Error(saved?.error || t('save_name_error'))
        nameToUse = tempName.trim()
        setEditingName(false)
      }
      if (!nameToUse) {
        setEditingName(true)
        throw new Error(t('add_full_name_error'))
      }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Please sign in again before generating a cover letter.')

      const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ analysis: selected.result, lang, tone, length, recipient: recipient.trim() || null, fullName: nameToUse })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${response.status}`)
      }
      const data = await response.json()
      setCoverLetter(data.letter || '')
      setSaveStatus('')
    } catch (error) {
      setGenError(error.message || t('cover_letter_error'))
    }
    setGenLoading(false)
  }

  const copyLetter = () => {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (loading) return <div className="coachPro-page"><main className="coachPro-shell"><div className="coachPro-skeleton" /></main></div>

  if (!analyses.length) {
    return (
      <div className="coachPro-page">
        <main className="coachPro-shell">
          <section className="coachPro-empty">
            <div>🎯</div>
            <p className="coachPro-kicker">{t('cv_coach_kicker')}</p>
            <h1>{t('no_analyses_yet')}</h1>
            <p>{t('coach_empty_premium')}</p>
          </section>
        </main>
      </div>
    )
  }

  const selectedScore = Number(selected?.score || 0)
  const selectedColor = scoreColor(selectedScore)
  const toneOptions = ['professional', 'warm', 'formal', 'enthusiastic']
  const lengthOptions = [['short', '~80 words'], ['standard', '~200 words'], ['detailed', '~320 words']]

  return (
    <div className="coachPro-page page-enter">
      <div className="coachPro-glow coachPro-glowOne" />
      <div className="coachPro-glow coachPro-glowTwo" />
      <main className="coachPro-shell">
        <section className="coachPro-hero">
          <div>
            <p className="coachPro-kicker">{t('cv_coach_kicker')}</p>
            <h1>{t('turn_analysis_action')}</h1>
            <p>{t('cv_coach_intro')}</p>
          </div>
          <aside className="coachPro-heroPanel">
            <div className="coachPro-orb" style={{ color: selectedColor }}>
              <strong>{selectedScore}</strong>
              <span>{t('selected_score')}</span>
            </div>
            <div>
              <p>{t('current_coaching_focus')}</p>
              <h2>{jobTitle(selected, t)}</h2>
              {companyName(selected) && <span>@ {companyName(selected)}</span>}
            </div>
          </aside>
        </section>

        <CvVersionVault selectedAnalysis={selected} />

        <section className="coachPro-selectorCard">
          <div>
            <p className="coachPro-kicker">{t('select_analysis')}</p>
            <h2>{t('choose_job_improve')}</h2>
          </div>
          <div className="coachPro-jobRail">
            {analyses.map(item => {
              const score = Number(item.score || 0)
              return (
                <button key={item.id} type="button" className={`coachPro-jobPill ${selected?.id === item.id ? 'is-active' : ''}`} onClick={() => setSelected(item)}>
                  <span style={{ color: scoreColor(score) }}>{score}%</span>
                  <strong>{jobTitle(item, t)}</strong>
                </button>
              )
            })}
          </div>
        </section>

        <section className="coachPro-workspace">
          <div>{selected && <AnalysisCoach analysis={selected} t={t} />}</div>
          <div className="coachPro-right">
            <article className="coachPro-card coachPro-letterCard">
              <header className="coachPro-cardHeader">
                <div>
                  <p className="coachPro-kicker">{t('cover_letter_label')}</p>
                  <h2>{t('cover_letter')}</h2>
                  <p>{t('cover_letter_ai_tailored')}</p>
                </div>
                {coverLetter && <button type="button" className="coachPro-copy" onClick={copyLetter}>{copied ? `✓ ${t('copied')}` : `📋 ${t('copy')}`}</button>}
              </header>

              <div className="coachPro-letterBody">
                {!coverLetter && !genLoading && (
                  <>
                    <div className="coachPro-letterIntro"><span>✉️</span><p>{t('cover_letter_prompt')}</p></div>
                    <div className="coachPro-field">
                      <div className="coachPro-fieldLabel"><span>{t('your_name')}</span>{!editingName && fullName && <button type="button" onClick={() => { setEditingName(true); setTempName(fullName) }}>{t('edit')}</button>}</div>
                      {editingName ? (
                        <div className="coachPro-inlineInput"><input value={tempName} onChange={e => setTempName(e.target.value)} placeholder={t('your_name_placeholder')} /><button type="button" disabled={!tempName.trim()} onClick={async () => { const saved = await saveFullName(tempName.trim()); if (saved?.success) setEditingName(false) }}>{t('save')}</button></div>
                      ) : (
                        <button type="button" className={`coachPro-nameBox ${fullName ? 'has-value' : ''}`} onClick={() => { setEditingName(true); setTempName(fullName || '') }}>{fullName || t('your_name_hint')}</button>
                      )}
                    </div>
                    <div className="coachPro-field"><div className="coachPro-fieldLabel"><span>{t('recipient_label')} <em>· {t('optional')}</em></span></div><input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={t('recipient_placeholder')} /></div>
                    <div className="coachPro-field"><p className="coachPro-smallTitle">{t('cover_letter_tone')}</p><div className="coachPro-optionGrid coachPro-optionGrid--two">{toneOptions.map(option => <button key={option} type="button" className={tone === option ? 'is-active' : ''} onClick={() => setTone(option)}>{t(`tone_${option}`)}</button>)}</div></div>
                    <div className="coachPro-field"><p className="coachPro-smallTitle">{t('cover_letter_length')}</p><div className="coachPro-optionGrid coachPro-optionGrid--three">{lengthOptions.map(([value, sub]) => <button key={value} type="button" className={length === value ? 'is-active' : ''} onClick={() => setLength(value)}><span>{t(`length_${value}`)}</span><em>{sub}</em></button>)}</div></div>
                    {genError && <p className="coachPro-error">⚠ {genError}</p>}
                    <button type="button" className="coachPro-generateBtn" onClick={generateCoverLetter}>{t('generate_letter')} →</button>
                  </>
                )}
                {genLoading && <div className="coachPro-generating"><div /><p>{t('writing_cover_letter')}</p></div>}
                {coverLetter && (
                  <div className="coachPro-letterResult">
                    <pre>{coverLetter}</pre>
                    {saveStatus && <p className={`coachPro-saveStatus ${saveStatus.startsWith('⚠') ? 'is-error' : ''}`}>{saveStatus}</p>}
                    <div className="coachPro-letterActions">
                      <button type="button" onClick={copyLetter}>{copied ? `✓ ${t('copied')}` : `📋 ${t('copy')}`}</button>
                      <button type="button" onClick={saveCoverLetter} disabled={saveLoading}>{saveLoading ? 'Saving...' : '💾 Save to history'}</button>
                      <button type="button" onClick={downloadCoverLetter}>⬇ Download .txt</button>
                      <button type="button" onClick={generateCoverLetter}>↺ {t('regenerate')}</button>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="coachPro-card coachPro-historyCard">
              <header className="coachPro-cardHeader coachPro-historyHeader">
                <div>
                  <p className="coachPro-kicker">Cover letter history</p>
                  <h2>Saved application messages</h2>
                  <p>Reuse, review, or delete cover letters generated for previous applications.</p>
                </div>
                <button type="button" className="coachPro-copy" onClick={fetchCoverLetters}>Refresh</button>
              </header>

              <div className="coachPro-historyBody">
                {historyError && <p className="coachPro-error">⚠ {historyError}</p>}
                {historyLoading && <div className="coachPro-miniSkeleton" />}
                {!historyLoading && !savedLetters.length && !historyError && (
                  <div className="coachPro-historyEmpty">
                    <strong>No saved letters yet</strong>
                    <span>Generate a letter, then click “Save to history”.</span>
                  </div>
                )}
                {!historyLoading && savedLetters.map(item => (
                  <div key={item.id} className="coachPro-historyItem">
                    <button type="button" onClick={() => loadSavedCoverLetter(item)}>
                      <strong>{item.job_title || 'Cover letter'}</strong>
                      <span>{item.company ? `@ ${item.company}` : 'Saved cover letter'} · {formatDateTime(item.created_at)}</span>
                    </button>
                    <button type="button" aria-label="Delete saved cover letter" onClick={() => deleteSavedCoverLetter(item.id)}>×</button>
                  </div>
                ))}
              </div>
            </article>

            <div className="coachPro-optimizeWrap"><OptimizeCvCard selected={selected} /></div>
          </div>
        </section>

        <CvRewriteCard t={t} lang={lang} user={user} />
      </main>
    </div>
  )
}
