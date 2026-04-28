import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

function QuickWinCard({ win, index }) {
  const [copiedTip, setCopiedTip] = useState(false)
  const [copiedExample, setCopiedExample] = useState(false)
  // Support both old (string) and new ({tip, example}) format
  const tip = typeof win === 'string' ? win : win?.tip || ''
  const example = typeof win === 'object' ? win?.example : null

  const copyTip = () => {
    navigator.clipboard.writeText(tip)
    setCopiedTip(true)
    setTimeout(() => setCopiedTip(false), 1500)
  }
  const copyExample = () => {
    if (!example) return
    navigator.clipboard.writeText(example)
    setCopiedExample(true)
    setTimeout(() => setCopiedExample(false), 1500)
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne, sans-serif' }}>{index+1}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, flex: 1, margin: 0, fontWeight: example ? 600 : 400 }}>{tip}</p>
        {!example && (
          <button onClick={copyTip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: copiedTip ? '#4caf7d' : 'var(--text-muted)', flexShrink: 0, padding: '2px 4px' }} title="Copy">
            {copiedTip ? '✓' : '📋'}
          </button>
        )}
      </div>
      {example && (
        <div style={{ background: 'var(--bg-input)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '8px 10px', marginLeft: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Example</span>
            <button onClick={copyExample} style={{
              background: copiedExample ? 'rgba(76,175,125,0.15)' : 'var(--bg-card)',
              border: `1px solid ${copiedExample ? 'rgba(76,175,125,0.3)' : 'var(--border)'}`,
              borderRadius: 14, padding: '2px 8px', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, color: copiedExample ? '#4caf7d' : 'var(--text-secondary)',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3
            }}>
              {copiedExample ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            "{example}"
          </p>
        </div>
      )}
    </div>
  )
}

function MissingKeywordChip({ word }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(word); setCopied(true); setTimeout(()=>setCopied(false),1200) }}
      style={{ padding: '5px 12px', borderRadius: 20, background: copied?'rgba(76,175,125,0.15)':'rgba(255,107,107,0.1)', border: `1px solid ${copied?'rgba(76,175,125,0.3)':'rgba(255,107,107,0.3)'}`, color: copied?'#4caf7d':'#ff7878', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
      {copied ? '✓' : '+'} {word}
    </button>
  )
}

function AnalysisCoach({ analysis, t }) {
  const r = analysis.result
  if (!r) return null
  const qw = r.quick_wins || []
  const missing = r.keyword_match?.missing_required || []
  const gaps = r.critical_gaps || []
  const edges = r.interview_prep?.your_edges || []

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
      {/* Card header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: `2px solid ${analysis.score>=70?'#4caf7d':analysis.score>=50?'#f5a623':'#ff6b6b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: analysis.score>=70?'rgba(76,175,125,0.1)':analysis.score>=50?'rgba(245,166,35,0.1)':'rgba(255,107,107,0.1)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: analysis.score>=70?'#4caf7d':analysis.score>=50?'#f5a623':'#ff6b6b', fontFamily: 'Syne, sans-serif' }}>{analysis.score}%</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.job_context?.title || analysis.job_title || 'Analysis'}
          </p>
          {r.job_context?.company && r.job_context.company !== 'Not specified' && (
            <p style={{ fontSize: 12, color: 'var(--accent)' }}>@ {r.job_context.company}</p>
          )}
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gap: 16 }}>
        {/* Quick wins */}
        {qw.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              ✏️ {t('quick_wins')} — {t('coach_add_hint') || 'Add these to your CV'}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {qw.map((w, i) => <QuickWinCard key={i} win={w} index={i} />)}
            </div>
          </div>
        )}

        {/* Missing keywords */}
        {missing.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              🏷️ {t('missing')} {t('keywords')} — {t('coach_keyword_hint') || 'Tap to copy, then add to your CV'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {missing.map(w => <MissingKeywordChip key={w} word={w} />)}
            </div>
          </div>
        )}

        {/* Strengths */}
        {edges.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              💪 {t('your_edges')}
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {edges.map((e,i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(76,175,125,0.06)', borderRadius: 10, borderLeft: '3px solid #4caf7d', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  ✓ {e}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical gaps */}
        {gaps.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#ff6b6b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              ⚠️ {t('gaps')} — {t('coach_gaps_hint') || 'Address these before applying'}
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {gaps.map((g,i) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,107,107,0.06)', borderRadius: 10, borderLeft: '3px solid #ff6b6b', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  ✗ {g}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CvCoachPage() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [tone, setTone] = useState('professional')
  const [genError, setGenError] = useState('')
  const [recipient, setRecipient] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const { fullName, saveFullName } = useUserProfile()

  // When user picks an analysis, pre-fill recipient if AI found one in the job posting
  useEffect(() => {
    if (selected?.result?.job_context?.hiring_contact) {
      setRecipient(selected.result.job_context.hiring_contact)
    } else {
      setRecipient('')
    }
    setCoverLetter('')
    setGenError('')
  }, [selected?.id])
  const [genLoading, setGenLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchAnalyses()
  }, [])

  const fetchAnalyses = async () => {
    const { data } = await supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setAnalyses(data || [])
    if (data?.length > 0) setSelected(data[0])
    setLoading(false)
  }

  const generateCoverLetter = async () => {
    if (!selected?.result) return
    setGenLoading(true)
    setCoverLetter('')
    try {
      // Prompt for full name first time
      let nameToUse = fullName
      if (!nameToUse) {
        setEditingName(true)
        setGenError(t('name_required_first') || 'Please add your full name first — it will be saved for future letters.')
        setGenLoading(false)
        return
      }
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: selected.result,
          lang,
          tone,
          recipient: recipient.trim() || null,
          fullName: nameToUse
        })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${res.status}`)
      }
      const data = await res.json()
      setCoverLetter(data.letter || '')
    } catch (e) {
      setCoverLetter('')
      setGenError(e.message || 'Could not generate cover letter. Please try again.')
    }
    setGenLoading(false)
  }

  const copyLetter = () => {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{ padding: 'clamp(20px,4vw,36px) clamp(16px,5vw,48px)', maxWidth: 900, margin: '0 auto' }}>
      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 12, borderRadius: 16 }} />)}
    </div>
  )

  if (analyses.length === 0) return (
    <div style={{ padding: 'clamp(20px,4vw,36px) clamp(16px,5vw,48px)', maxWidth: 900, margin: '0 auto', textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
        {t('no_analyses')}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('coach_empty') || 'Run an analysis first to get CV coaching and cover letter generation.'}</p>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(20px,4vw,36px) clamp(16px,5vw,48px) 80px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          🎤 {t('nav_coach') || 'CV Coach'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('coach_subtitle') || 'Quick wins, missing keywords and a cover letter — tailored for each job.'}
        </p>
      </div>

      {/* Job selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          {t('select_job') || 'Select a job analysis'}
        </label>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {analyses.map(a => {
            const color = a.score>=70?'#4caf7d':a.score>=50?'#f5a623':'#ff6b6b'
            const isActive = selected?.id === a.id
            return (
              <button key={a.id} onClick={() => { setSelected(a); setCoverLetter('') }} style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 20,
                background: isActive ? 'var(--accent-bg)' : 'var(--bg-card)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'Syne, sans-serif' }}>{a.score}%</span>
                <span style={{ fontSize: 12, color: isActive?'var(--accent)':'var(--text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.result?.job_context?.title || a.job_title || 'Job'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,420px), 1fr))', gap: 16 }}>
        {/* CV coaching */}
        <div>
          {selected && <AnalysisCoach analysis={selected} t={t} />}
        </div>

        {/* Cover letter */}
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', position: 'sticky', top: 70 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: 2 }}>
                  ✉️ {t('cover_letter') || 'Cover letter'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('cover_letter_desc') || 'AI-generated, tailored for this role'}
                </p>
              </div>
              {coverLetter && (
                <button onClick={copyLetter} style={{ padding: '7px 14px', borderRadius: 20, background: copied?'rgba(76,175,125,0.15)':'var(--bg-input)', border: `1px solid ${copied?'rgba(76,175,125,0.3)':'var(--border)'}`, color: copied?'#4caf7d':'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              )}
            </div>

            <div style={{ padding: 16 }}>
              {!coverLetter && !genLoading && (
                <div style={{ padding: '8px 4px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6, textAlign: 'center' }}>
                    ✉️ {t('cover_letter_prompt') || 'Generate a professional cover letter tailored to this job based on your CV analysis.'}
                  </p>

                  {/* Your name */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                        {t('your_name') || 'Your name'}
                      </span>
                      {!editingName && fullName && (
                        <button onClick={() => { setEditingName(true); setTempName(fullName) }} style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {t('edit') || 'Edit'}
                        </button>
                      )}
                    </div>
                    {editingName ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={tempName}
                          onChange={e => setTempName(e.target.value)}
                          placeholder={t('your_name_placeholder') || 'e.g. Roland Dzoagbe'}
                          style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
                          autoFocus
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && tempName.trim()) {
                              await saveFullName(tempName)
                              setEditingName(false)
                              setGenError('')
                            }
                            if (e.key === 'Escape') setEditingName(false)
                          }}
                        />
                        <button
                          onClick={async () => {
                            if (!tempName.trim()) return
                            await saveFullName(tempName)
                            setEditingName(false)
                            setGenError('')
                          }}
                          style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#1A1B22', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}
                        >{t('save') || 'Save'}</button>
                      </div>
                    ) : (
                      <div style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: fullName ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer' }}
                        onClick={() => { setEditingName(true); setTempName(fullName || '') }}>
                        {fullName || (t('your_name_hint') || 'Click to add your full name (saved for future letters)')}
                      </div>
                    )}
                  </div>

                  {/* Recipient */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                        {t('recipient_label') || 'Recipient'} <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-hint)' }}>· {t('optional') || 'optional'}</span>
                      </span>
                      {selected?.result?.job_context?.hiring_contact && recipient === selected.result.job_context.hiring_contact && (
                        <span style={{ fontSize: 9, color: '#4caf7d', fontWeight: 600 }}>✨ {t('found_in_posting') || 'Found in posting'}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={recipient}
                      onChange={e => setRecipient(e.target.value)}
                      placeholder={t('recipient_placeholder') || 'e.g. Marie Dupont (or leave empty for default)'}
                      style={{ padding: '8px 12px', fontSize: 13 }}
                    />
                  </div>

                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                    {t('cover_letter_tone') || 'Tone'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 16 }}>
                    {[
                      { v: 'professional', label: t('tone_professional') || 'Professional' },
                      { v: 'warm', label: t('tone_warm') || 'Warm' },
                      { v: 'formal', label: t('tone_formal') || 'Formal' },
                      { v: 'enthusiastic', label: t('tone_enthusiastic') || 'Enthusiastic' }
                    ].map(o => (
                      <button key={o.v} onClick={() => setTone(o.v)} style={{
                        padding: '8px 10px', borderRadius: 10,
                        border: `1px solid ${tone === o.v ? 'var(--accent)' : 'var(--border)'}`,
                        background: tone === o.v ? 'var(--accent-bg)' : 'var(--bg-input)',
                        color: tone === o.v ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: tone === o.v ? 600 : 400
                      }}>{o.label}</button>
                    ))}
                  </div>

                  {genError && (
                    <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 10, padding: '9px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10 }}>
                      ⚠ {genError}
                    </p>
                  )}

                  <button onClick={() => { setGenError(''); generateCoverLetter() }} disabled={!selected} className="btn-primary" style={{ width: '100%' }}>
                    {t('generate_letter') || 'Generate cover letter →'}
                  </button>
                </div>
              )}

              {genLoading && (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', animation: 'pulse 1.8s ease infinite' }}>
                    {t('generating') || 'Writing your cover letter...'}
                  </p>
                </div>
              )}

              {coverLetter && (
                <div>
                  <pre style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px', maxHeight: 420, overflowY: 'auto' }}>
                    {coverLetter}
                  </pre>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <button onClick={copyLetter} style={{ padding: '10px', borderRadius: 10, background: copied ? 'rgba(76,175,125,0.15)' : 'var(--accent)', border: copied ? '1px solid rgba(76,175,125,0.3)' : 'none', color: copied ? '#4caf7d' : '#1A1B22', fontSize: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>
                      {copied ? '✓ ' + (t('copied') || 'Copied') : '📋 ' + (t('copy') || 'Copy')}
                    </button>
                    <button onClick={() => { setGenError(''); generateCoverLetter() }} style={{ padding: '10px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ↺ {t('regenerate') || 'Regenerate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
