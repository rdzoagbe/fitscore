import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUserProfile } from '../hooks/useUserProfile'
import OptimizeCvCard from '../components/OptimizeCvCard'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const theme = {
  ivory: '#FAF7F1',
  paper: '#FFFDF8',
  navy: '#10182B',
  muted: '#5F6472',
  line: 'rgba(16,24,43,0.12)',
  copper: '#B5663C',
  copperSoft: 'rgba(181,102,60,0.10)',
  green: '#557C64',
  red: '#B85C55',
  gold: '#B9863B'
}

const pageVars = {
  '--bg': theme.ivory,
  '--bg-card': theme.paper,
  '--bg-input': 'rgba(255,255,255,0.62)',
  '--text-primary': theme.navy,
  '--text-secondary': theme.muted,
  '--text-muted': theme.muted,
  '--text-hint': 'rgba(95,100,114,0.72)',
  '--border': theme.line,
  '--accent': theme.copper,
  '--accent-bg': theme.copperSoft
}

function cardStyle(extra = {}) {
  return {
    background: theme.paper,
    border: `1px solid ${theme.line}`,
    borderRadius: 24,
    boxShadow: '0 20px 55px rgba(16,24,43,0.07)',
    ...extra
  }
}

function QuickWinCard({ win, index }) {
  const [copiedTip, setCopiedTip] = useState(false)
  const [copiedExample, setCopiedExample] = useState(false)
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
    <div style={{ ...cardStyle({ borderRadius: 18, padding: '13px 15px', boxShadow: 'none' }), display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: theme.copperSoft, border: `1px solid rgba(181,102,60,0.28)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: theme.copper }}>{index + 1}</span>
        </div>
        <p style={{ fontSize: 13, color: theme.navy, lineHeight: 1.6, flex: 1, margin: 0, fontWeight: example ? 750 : 500 }}>{tip}</p>
        {!example && (
          <button onClick={copyTip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: copiedTip ? theme.green : theme.muted, flexShrink: 0, padding: '2px 4px' }} title="Copy">
            {copiedTip ? '✓' : '📋'}
          </button>
        )}
      </div>
      {example && (
        <div style={{ background: 'rgba(250,247,241,0.75)', borderLeft: `3px solid ${theme.copper}`, borderRadius: 10, padding: '9px 11px', marginLeft: 38 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: theme.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Example</span>
            <button onClick={copyExample} style={{ background: copiedExample ? 'rgba(85,124,100,0.15)' : theme.paper, border: `1px solid ${copiedExample ? 'rgba(85,124,100,0.3)' : theme.line}`, borderRadius: 14, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: copiedExample ? theme.green : theme.muted, fontFamily: 'inherit' }}>
              {copiedExample ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: theme.muted, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{example}"</p>
        </div>
      )}
    </div>
  )
}

function MissingKeywordChip({ word }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(word); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      style={{ padding: '6px 12px', borderRadius: 20, background: copied ? 'rgba(85,124,100,0.15)' : 'rgba(184,92,85,0.09)', border: `1px solid ${copied ? 'rgba(85,124,100,0.3)' : 'rgba(184,92,85,0.22)'}`, color: copied ? theme.green : theme.red, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>
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
  const scoreColor = analysis.score >= 70 ? theme.green : analysis.score >= 50 ? theme.gold : theme.red

  return (
    <div style={{ ...cardStyle({ overflow: 'hidden', marginBottom: 16 }) }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: `2px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${scoreColor}18` }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: scoreColor, fontFamily: 'Georgia, serif' }}>{analysis.score}%</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: theme.navy, fontFamily: 'Georgia, Newsreader, serif', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.04em' }}>
            {r.job_context?.title || analysis.job_title || 'Analysis'}
          </p>
          {r.job_context?.company && r.job_context.company !== 'Not specified' && <p style={{ fontSize: 12, color: theme.copper, fontWeight: 800 }}>@ {r.job_context.company}</p>}
        </div>
      </div>

      <div style={{ padding: 18, display: 'grid', gap: 18 }}>
        {qw.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 10 }}>
              ✏️ {t('quick_wins')} — {t('coach_add_hint') || 'Add these to your CV'}
            </p>
            <div style={{ display: 'grid', gap: 9 }}>{qw.map((w, i) => <QuickWinCard key={i} win={w} index={i} />)}</div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
              🏷️ {t('missing')} {t('keywords')} — {t('coach_keyword_hint') || 'Tap to copy, then add to your CV'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{missing.map(w => <MissingKeywordChip key={w} word={w} />)}</div>
          </div>
        )}

        {edges.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>💪 {t('your_edges')}</p>
            <div style={{ display: 'grid', gap: 7 }}>
              {edges.map((e, i) => <div key={i} style={{ padding: '9px 12px', background: 'rgba(85,124,100,0.08)', borderRadius: 12, borderLeft: `3px solid ${theme.green}`, fontSize: 13, color: theme.muted, lineHeight: 1.5 }}>✓ {e}</div>)}
            </div>
          </div>
        )}

        {gaps.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: theme.red, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>⚠️ {t('gaps')} — {t('coach_gaps_hint') || 'Address these before applying'}</p>
            <div style={{ display: 'grid', gap: 7 }}>
              {gaps.map((g, i) => <div key={i} style={{ padding: '9px 12px', background: 'rgba(184,92,85,0.07)', borderRadius: 12, borderLeft: `3px solid ${theme.red}`, fontSize: 13, color: theme.muted, lineHeight: 1.5 }}>✗ {g}</div>)}
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
  const [length, setLength] = useState('standard')
  const [genError, setGenError] = useState('')
  const [recipient, setRecipient] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { fullName, saveFullName } = useUserProfile()

  useEffect(() => { fetchAnalyses() }, [])

  useEffect(() => {
    if (selected?.result?.job_context?.hiring_contact) setRecipient(selected.result.job_context.hiring_contact)
    else setRecipient('')
    setCoverLetter('')
    setGenError('')
  }, [selected?.id])

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
      let nameToUse = fullName
      if (!nameToUse && tempName?.trim()) {
        const saveResult = await saveFullName(tempName.trim())
        if (saveResult?.success) {
          nameToUse = tempName.trim()
          setEditingName(false)
        } else {
          setGenError(saveResult?.error || 'Could not save your name. Please try again.')
          setGenLoading(false)
          return
        }
      }
      if (!nameToUse) {
        setEditingName(true)
        setGenError(t('name_required_first') || 'Please add your full name first — it will be saved for future letters.')
        setGenLoading(false)
        return
      }
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: selected.result, lang, tone, length, recipient: recipient.trim() || null, fullName: nameToUse })
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
    <div style={{ ...pageVars, minHeight: '100dvh', background: theme.ivory, padding: 'clamp(20px,4vw,36px) clamp(16px,5vw,48px)', maxWidth: 900, margin: '0 auto' }}>
      {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, marginBottom: 12, borderRadius: 20 }} />)}
    </div>
  )

  if (analyses.length === 0) return (
    <div style={{ ...pageVars, minHeight: '100dvh', background: theme.ivory, padding: 'clamp(20px,4vw,36px) clamp(16px,5vw,48px)', maxWidth: 900, margin: '0 auto', textAlign: 'center', paddingTop: 80 }}>
      <div style={{ ...cardStyle({ padding: 34 }) }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
        <h2 style={{ fontFamily: 'Georgia, Newsreader, serif', fontSize: 34, color: theme.navy, marginBottom: 8, fontWeight: 500, letterSpacing: '-0.06em' }}>{t('no_analyses')}</h2>
        <p style={{ fontSize: 14, color: theme.muted }}>{t('coach_empty') || 'Run an analysis first to get CV coaching and cover letter generation.'}</p>
      </div>
    </div>
  )

  return (
    <div style={{ ...pageVars, minHeight: '100dvh', background: `radial-gradient(circle at 16% 8%, rgba(181,102,60,0.12), transparent 34%), linear-gradient(180deg, ${theme.ivory} 0%, #F8F1E8 48%, ${theme.ivory} 100%)`, padding: 'clamp(20px,4vw,38px) clamp(16px,5vw,48px) 90px' }}>
      <main style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ ...cardStyle({ padding: 'clamp(24px,4vw,42px)', marginBottom: 22, borderRadius: 30 }) }}>
          <p style={{ margin: 0, color: theme.copper, fontSize: 11, fontWeight: 950, letterSpacing: '0.14em', textTransform: 'uppercase' }}>CV Coach</p>
          <h1 style={{ fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(42px,6vw,70px)', fontWeight: 500, color: theme.navy, margin: '10px 0 0', letterSpacing: '-0.075em', lineHeight: 0.95 }}>
            Improve before you apply.
          </h1>
          <p style={{ fontSize: 15, color: theme.muted, lineHeight: 1.7, maxWidth: 720, margin: '14px 0 0' }}>
            {t('coach_subtitle') || 'Quick wins, missing keywords and a cover letter — tailored for each job.'}
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.10em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            {t('select_job') || 'Select a job analysis'}
          </label>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {analyses.map(a => {
              const color = a.score >= 70 ? theme.green : a.score >= 50 ? theme.gold : theme.red
              const isActive = selected?.id === a.id
              return (
                <button key={a.id} onClick={() => { setSelected(a); setCoverLetter('') }} style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 999, background: isActive ? theme.navy : theme.paper, border: `1px solid ${isActive ? theme.navy : theme.line}`, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s', boxShadow: isActive ? '0 14px 30px rgba(16,24,43,0.16)' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: isActive ? theme.ivory : color, fontFamily: 'Georgia, serif' }}>{a.score}%</span>
                  <span style={{ fontSize: 12, color: isActive ? theme.ivory : theme.navy, maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800 }}>
                    {a.result?.job_context?.title || a.job_title || 'Job'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,420px), 1fr))', gap: 18 }}>
          <div>{selected && <AnalysisCoach analysis={selected} t={t} />}</div>

          <div>
            <div style={{ ...cardStyle({ overflow: 'hidden', position: 'sticky', top: 86, marginBottom: 16 }) }}>
              <div style={{ padding: '16px 18px', borderBottom: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 19, fontWeight: 500, color: theme.navy, fontFamily: 'Georgia, Newsreader, serif', marginBottom: 2, letterSpacing: '-0.04em' }}>✉️ {t('cover_letter') || 'Cover letter'}</p>
                  <p style={{ fontSize: 12, color: theme.muted }}>{t('cover_letter_desc') || 'AI-generated, tailored for this role'}</p>
                </div>
                {coverLetter && <button onClick={copyLetter} style={{ padding: '8px 14px', borderRadius: 999, background: copied ? 'rgba(85,124,100,0.15)' : 'rgba(255,255,255,0.62)', border: `1px solid ${copied ? 'rgba(85,124,100,0.3)' : theme.line}`, color: copied ? theme.green : theme.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>{copied ? '✓ Copied' : '📋 Copy'}</button>}
              </div>

              <div style={{ padding: 18 }}>
                {!coverLetter && !genLoading && (
                  <div style={{ padding: '6px 2px' }}>
                    <p style={{ fontSize: 13, color: theme.muted, marginBottom: 16, lineHeight: 1.6, textAlign: 'center' }}>✉️ {t('cover_letter_prompt') || 'Generate a professional cover letter tailored to this job based on your CV analysis.'}</p>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('your_name') || 'Your name'}</span>
                        {!editingName && fullName && <button onClick={() => { setEditingName(true); setTempName(fullName) }} style={{ fontSize: 10, color: theme.copper, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('edit') || 'Edit'}</button>}
                      </div>
                      {editingName ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} placeholder={t('your_name_placeholder') || 'e.g. Roland Dzoagbe'} style={{ flex: 1, padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.62)', border: `1px solid ${theme.line}`, borderRadius: 12, color: theme.navy }} autoFocus onKeyDown={async e => { if (e.key === 'Enter' && tempName.trim()) { const result = await saveFullName(tempName); if (result?.success) { setEditingName(false); setGenError('') } } if (e.key === 'Escape') setEditingName(false) }} />
                          <button onClick={async () => { if (!tempName.trim()) return; const result = await saveFullName(tempName); if (result?.success) { setEditingName(false); setGenError('') } }} disabled={!tempName.trim()} style={{ padding: '9px 14px', borderRadius: 12, background: tempName.trim() ? theme.navy : 'rgba(255,255,255,0.62)', border: tempName.trim() ? 'none' : `1px solid ${theme.line}`, color: tempName.trim() ? theme.ivory : theme.muted, fontSize: 12, fontWeight: 800, cursor: tempName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>{t('save') || 'Save'}</button>
                        </div>
                      ) : (
                        <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.62)', border: `1px solid ${theme.line}`, borderRadius: 12, fontSize: 13, color: fullName ? theme.navy : theme.muted, cursor: 'pointer' }} onClick={() => { setEditingName(true); setTempName(fullName || '') }}>
                          {fullName || (t('your_name_hint') || 'Click to add your full name (saved for future letters)')}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{t('recipient_label') || 'Recipient'} <span style={{ textTransform: 'none', fontWeight: 500, color: theme.muted }}>· {t('optional') || 'optional'}</span></span>
                      <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={t('recipient_placeholder') || 'e.g. Marie Dupont (or leave empty for default)'} style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.62)', border: `1px solid ${theme.line}`, borderRadius: 12, color: theme.navy }} />
                    </div>

                    <p style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{t('cover_letter_tone') || 'Tone'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7, marginBottom: 14 }}>
                      {[{ v: 'professional', label: t('tone_professional') || 'Professional' }, { v: 'warm', label: t('tone_warm') || 'Warm' }, { v: 'formal', label: t('tone_formal') || 'Formal' }, { v: 'enthusiastic', label: t('tone_enthusiastic') || 'Enthusiastic' }].map(o => (
                        <button key={o.v} onClick={() => setTone(o.v)} style={{ padding: '9px 10px', borderRadius: 12, border: `1px solid ${tone === o.v ? theme.navy : theme.line}`, background: tone === o.v ? theme.navy : 'rgba(255,255,255,0.62)', color: tone === o.v ? theme.ivory : theme.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>{o.label}</button>
                      ))}
                    </div>

                    <p style={{ fontSize: 10, fontWeight: 900, color: theme.copper, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{t('cover_letter_length') || 'Length'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 16 }}>
                      {[{ v: 'short', label: t('length_short') || 'Short', sub: t('length_short_sub') || '~80 words' }, { v: 'standard', label: t('length_standard') || 'Standard', sub: t('length_standard_sub') || '~200 words' }, { v: 'detailed', label: t('length_detailed') || 'Detailed', sub: t('length_detailed_sub') || '~320 words' }].map(o => (
                        <button key={o.v} onClick={() => setLength(o.v)} style={{ padding: '9px 6px', borderRadius: 12, border: `1px solid ${length === o.v ? theme.navy : theme.line}`, background: length === o.v ? theme.navy : 'rgba(255,255,255,0.62)', color: length === o.v ? theme.ivory : theme.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                          <span>{o.label}</span><span style={{ fontSize: 9, color: length === o.v ? 'rgba(250,247,241,0.76)' : 'rgba(95,100,114,0.72)', fontWeight: 500 }}>{o.sub}</span>
                        </button>
                      ))}
                    </div>

                    {genError && <p style={{ fontSize: 12, color: theme.red, marginBottom: 10, padding: '10px 12px', background: 'rgba(184,92,85,0.08)', border: '1px solid rgba(184,92,85,0.25)', borderRadius: 12 }}>⚠ {genError}</p>}

                    <button onClick={() => { setGenError(''); generateCoverLetter() }} disabled={!selected} style={{ width: '100%', minHeight: 46, borderRadius: 999, border: 0, background: theme.navy, color: theme.ivory, fontWeight: 900, cursor: 'pointer' }}>{t('generate_letter') || 'Generate cover letter →'}</button>
                  </div>
                )}

                {genLoading && <div style={{ textAlign: 'center', padding: '32px 16px' }}><div style={{ width: 28, height: 28, border: `2px solid ${theme.line}`, borderTop: `2px solid ${theme.copper}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} /><p style={{ fontSize: 13, color: theme.muted, animation: 'pulse 1.8s ease infinite' }}>{t('generating') || 'Writing your cover letter...'}</p></div>}

                {coverLetter && <div><pre style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: theme.navy, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, background: 'rgba(250,247,241,0.75)', borderRadius: 14, padding: '15px 16px', maxHeight: 420, overflowY: 'auto', border: `1px solid ${theme.line}` }}>{coverLetter}</pre><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}><button onClick={copyLetter} style={{ padding: '11px', borderRadius: 12, background: copied ? 'rgba(85,124,100,0.15)' : theme.navy, border: copied ? '1px solid rgba(85,124,100,0.3)' : 'none', color: copied ? theme.green : theme.ivory, fontSize: 12, cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit' }}>{copied ? '✓ ' + (t('copied') || 'Copied') : '📋 ' + (t('copy') || 'Copy')}</button><button onClick={() => { setGenError(''); generateCoverLetter() }} style={{ padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.62)', border: `1px solid ${theme.line}`, color: theme.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>↺ {t('regenerate') || 'Regenerate'}</button></div></div>}
              </div>
            </div>

            <OptimizeCvCard selected={selected} />
          </div>
        </div>
      </main>
    </div>
  )
}
