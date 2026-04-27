import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

function QuickWinCard({ win, index }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(win)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne, sans-serif' }}>{index+1}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, flex: 1, margin: 0 }}>{win}</p>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: copied ? '#4caf7d' : 'var(--text-muted)', flexShrink: 0, padding: '2px 4px' }} title="Copy">
        {copied ? '✓' : '📋'}
      </button>
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
  const { t } = useLang()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
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
      const r = selected.result
      const prompt = `Write a professional cover letter for this job application.

JOB: ${r.job_context?.title || 'Position'} at ${r.job_context?.company || 'the company'}
LOCATION: ${r.job_context?.location || 'Not specified'}
CONTRACT: ${r.job_context?.contract_type || 'Not specified'}

JOB SUMMARY: ${r.job_summary || ''}

CANDIDATE STRENGTHS (from CV analysis):
${(r.interview_prep?.your_edges || []).map(e => '- ' + e).join('\n')}

KEYWORDS TO INCLUDE:
${(r.keyword_match?.found || []).slice(0, 8).join(', ')}

Write a concise, professional cover letter (3 short paragraphs). 
- Opening: express interest and top qualification
- Middle: 2-3 specific achievements matching the role requirements  
- Closing: call to action
Do NOT include date, address blocks, or placeholders like [Your Name]. Just the letter body.
Tone: confident and professional but not stiff. Maximum 220 words.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.map(b => b.text||'').join('') || ''
      setCoverLetter(text.trim())
    } catch (e) {
      setCoverLetter('Error generating cover letter. Please try again.')
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
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                    {t('cover_letter_prompt') || 'Generate a professional cover letter tailored to this job based on your CV analysis.'}
                  </p>
                  <button onClick={generateCoverLetter} disabled={!selected} className="btn-primary" style={{ width: '100%' }}>
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
                  <button onClick={generateCoverLetter} style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ↺ {t('regenerate') || 'Regenerate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
