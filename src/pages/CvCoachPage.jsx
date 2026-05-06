import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUserProfile } from '../hooks/useUserProfile'
import OptimizeCvCard from '../components/OptimizeCvCard'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import './CvCoachPage.css'

const scoreColor = score => score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff6b6b'
const jobTitle = item => item?.result?.job_context?.title || item?.job_title || 'Job analysis'
const companyName = item => {
  const company = item?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

function CopyButton({ value, children }) {
  const [copied, setCopied] = useState(false)
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
      {copied ? '✓ Copied' : children || 'Copy'}
    </button>
  )
}

function QuickWin({ item, index }) {
  const tip = typeof item === 'string' ? item : item?.tip || ''
  const example = typeof item === 'object' ? item?.example : null
  return (
    <article className="coachPro-quickWin">
      <div className="coachPro-quickHead">
        <span>{index + 1}</span>
        <strong>{tip}</strong>
        {!example && <CopyButton value={tip}>📋</CopyButton>}
      </div>
      {example && (
        <div className="coachPro-example">
          <small>Example</small>
          <p>“{example}”</p>
          <CopyButton value={example}>📋 Copy</CopyButton>
        </div>
      )}
    </article>
  )
}

function Keyword({ word }) {
  return <CopyButton value={word}>+ {word}</CopyButton>
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
          <p className="coachPro-kicker">CV INTELLIGENCE</p>
          <h2>{jobTitle(analysis)}</h2>
          {companyName(analysis) && <span>@ {companyName(analysis)}</span>}
        </div>
      </header>

      <div className="coachPro-stack">
        {quickWins.length > 0 && (
          <InsightSection label="QUICK WINS" title={t('coach_add_hint') || 'Add these to your CV'} tone="accent">
            <div className="coachPro-listGrid">
              {quickWins.map((win, index) => <QuickWin key={index} item={win} index={index} />)}
            </div>
          </InsightSection>
        )}

        {missing.length > 0 && (
          <InsightSection label="MISSING KEYWORDS" title={t('coach_keyword_hint') || 'Tap to copy, then add to your CV'} tone="warning">
            <div className="coachPro-keywords">
              {missing.map(word => <Keyword key={word} word={word} />)}
            </div>
          </InsightSection>
        )}

        {edges.length > 0 && (
          <InsightSection label="YOUR EDGES" title={t('your_edges') || 'Strengths to highlight'} tone="success">
            <div className="coachPro-bullets">
              {edges.map((edge, index) => <p key={index}>✓ {edge}</p>)}
            </div>
          </InsightSection>
        )}

        {gaps.length > 0 && (
          <InsightSection label="GAPS" title={t('coach_gaps_hint') || 'Address these before applying'} tone="danger">
            <div className="coachPro-bullets">
              {gaps.map((gap, index) => <p key={index}>✗ {gap}</p>)}
            </div>
          </InsightSection>
        )}
      </div>
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

  useEffect(() => { fetchAnalyses() }, [])

  useEffect(() => {
    setRecipient(selected?.result?.job_context?.hiring_contact || '')
    setCoverLetter('')
    setGenError('')
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

  const generateCoverLetter = async () => {
    if (!selected?.result) return
    setGenLoading(true)
    setCoverLetter('')
    setGenError('')

    try {
      let nameToUse = fullName
      if (!nameToUse && tempName.trim()) {
        const saved = await saveFullName(tempName.trim())
        if (!saved?.success) throw new Error(saved?.error || 'Could not save your name. Please try again.')
        nameToUse = tempName.trim()
        setEditingName(false)
      }
      if (!nameToUse) {
        setEditingName(true)
        throw new Error(t('name_required_first') || 'Please add your full name first.')
      }

      const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: selected.result,
          lang,
          tone,
          length,
          recipient: recipient.trim() || null,
          fullName: nameToUse
        })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${response.status}`)
      }
      const data = await response.json()
      setCoverLetter(data.letter || '')
    } catch (error) {
      setGenError(error.message || 'Could not generate cover letter. Please try again.')
    }
    setGenLoading(false)
  }

  const copyLetter = () => {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (loading) {
    return <div className="coachPro-page"><main className="coachPro-shell"><div className="coachPro-skeleton" /></main></div>
  }

  if (!analyses.length) {
    return (
      <div className="coachPro-page">
        <main className="coachPro-shell">
          <section className="coachPro-empty">
            <div>🎯</div>
            <p className="coachPro-kicker">CV COACH</p>
            <h1>{t('no_analyses') || 'No analyses yet'}</h1>
            <p>{t('coach_empty') || 'Run an analysis first to get CV coaching and cover letter generation.'}</p>
          </section>
        </main>
      </div>
    )
  }

  const selectedScore = Number(selected?.score || 0)
  const selectedColor = scoreColor(selectedScore)
  const toneOptions = ['professional', 'warm', 'formal', 'enthusiastic']
  const lengthOptions = [
    ['short', '~80 words'],
    ['standard', '~200 words'],
    ['detailed', '~320 words']
  ]

  return (
    <div className="coachPro-page page-enter">
      <div className="coachPro-glow coachPro-glowOne" />
      <div className="coachPro-glow coachPro-glowTwo" />
      <main className="coachPro-shell">
        <section className="coachPro-hero">
          <div>
            <p className="coachPro-kicker">CV COACH</p>
            <h1>Turn analysis into action</h1>
            <p>Transform ATS results into stronger CV bullets, sharper keywords, clearer achievements, and a tailored cover letter for each opportunity.</p>
          </div>
          <aside className="coachPro-heroPanel">
            <div className="coachPro-orb" style={{ color: selectedColor }}>
              <strong>{selectedScore}</strong>
              <span>selected score</span>
            </div>
            <div>
              <p>Current coaching focus</p>
              <h2>{jobTitle(selected)}</h2>
              {companyName(selected) && <span>@ {companyName(selected)}</span>}
            </div>
          </aside>
        </section>

        <section className="coachPro-selectorCard">
          <div>
            <p className="coachPro-kicker">SELECT ANALYSIS</p>
            <h2>{t('select_job') || 'Choose the job you want to improve for'}</h2>
          </div>
          <div className="coachPro-jobRail">
            {analyses.map(item => {
              const score = Number(item.score || 0)
              return (
                <button key={item.id} type="button" className={`coachPro-jobPill ${selected?.id === item.id ? 'is-active' : ''}`} onClick={() => setSelected(item)}>
                  <span style={{ color: scoreColor(score) }}>{score}%</span>
                  <strong>{jobTitle(item)}</strong>
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
                  <p className="coachPro-kicker">COVER LETTER</p>
                  <h2>{t('cover_letter') || 'Cover letter'}</h2>
                  <p>{t('cover_letter_desc') || 'AI-generated and tailored for this role.'}</p>
                </div>
                {coverLetter && <button type="button" className="coachPro-copy" onClick={copyLetter}>{copied ? '✓ Copied' : '📋 Copy'}</button>}
              </header>

              <div className="coachPro-letterBody">
                {!coverLetter && !genLoading && (
                  <>
                    <div className="coachPro-letterIntro"><span>✉️</span><p>{t('cover_letter_prompt') || 'Generate a professional cover letter tailored to this job based on your CV analysis.'}</p></div>
                    <div className="coachPro-field">
                      <div className="coachPro-fieldLabel"><span>{t('your_name') || 'Your name'}</span>{!editingName && fullName && <button type="button" onClick={() => { setEditingName(true); setTempName(fullName) }}>{t('edit') || 'Edit'}</button>}</div>
                      {editingName ? (
                        <div className="coachPro-inlineInput"><input value={tempName} onChange={e => setTempName(e.target.value)} placeholder={t('your_name_placeholder') || 'e.g. Roland Dzoagbe'} /><button type="button" disabled={!tempName.trim()} onClick={async () => { const saved = await saveFullName(tempName.trim()); if (saved?.success) setEditingName(false) }}>{t('save') || 'Save'}</button></div>
                      ) : (
                        <button type="button" className={`coachPro-nameBox ${fullName ? 'has-value' : ''}`} onClick={() => { setEditingName(true); setTempName(fullName || '') }}>{fullName || (t('your_name_hint') || 'Click to add your full name')}</button>
                      )}
                    </div>
                    <div className="coachPro-field"><div className="coachPro-fieldLabel"><span>{t('recipient_label') || 'Recipient'} <em>· {t('optional') || 'optional'}</em></span></div><input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={t('recipient_placeholder') || 'e.g. Marie Dupont'} /></div>
                    <div className="coachPro-field"><p className="coachPro-smallTitle">{t('cover_letter_tone') || 'Tone'}</p><div className="coachPro-optionGrid coachPro-optionGrid--two">{toneOptions.map(option => <button key={option} type="button" className={tone === option ? 'is-active' : ''} onClick={() => setTone(option)}>{t(`tone_${option}`) || option}</button>)}</div></div>
                    <div className="coachPro-field"><p className="coachPro-smallTitle">{t('cover_letter_length') || 'Length'}</p><div className="coachPro-optionGrid coachPro-optionGrid--three">{lengthOptions.map(([value, sub]) => <button key={value} type="button" className={length === value ? 'is-active' : ''} onClick={() => setLength(value)}><span>{t(`length_${value}`) || value}</span><em>{sub}</em></button>)}</div></div>
                    {genError && <p className="coachPro-error">⚠ {genError}</p>}
                    <button type="button" className="coachPro-generateBtn" onClick={generateCoverLetter}>{t('generate_letter') || 'Generate cover letter'} →</button>
                  </>
                )}
                {genLoading && <div className="coachPro-generating"><div /><p>{t('generating') || 'Writing your cover letter...'}</p></div>}
                {coverLetter && <div className="coachPro-letterResult"><pre>{coverLetter}</pre><div><button type="button" onClick={copyLetter}>{copied ? '✓ Copied' : '📋 Copy'}</button><button type="button" onClick={generateCoverLetter}>↺ {t('regenerate') || 'Regenerate'}</button></div></div>}
              </div>
            </article>
            <div className="coachPro-optimizeWrap"><OptimizeCvCard selected={selected} /></div>
          </div>
        </section>
      </main>
    </div>
  )
}
