import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUserProfile } from '../hooks/useUserProfile'
import OptimizeCvCard from '../components/OptimizeCvCard'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import './CvCoachPage.css'

const scoreColor = score => score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff6b6b'
const jobTitle = (item, t) => item?.result?.job_context?.title || item?.job_title || t('job_analysis')
const companyName = item => {
  const company = item?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : ''
}

function CopyButton({ value, children, t }) {
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
        if (!saved?.success) throw new Error(saved?.error || t('save_name_error'))
        nameToUse = tempName.trim()
        setEditingName(false)
      }
      if (!nameToUse) {
        setEditingName(true)
        throw new Error(t('add_full_name_error'))
      }

      const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: selected.result, lang, tone, length, recipient: recipient.trim() || null, fullName: nameToUse })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Server error ${response.status}`)
      }
      const data = await response.json()
      setCoverLetter(data.letter || '')
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
                {coverLetter && <div className="coachPro-letterResult"><pre>{coverLetter}</pre><div><button type="button" onClick={copyLetter}>{copied ? `✓ ${t('copied')}` : `📋 ${t('copy')}`}</button><button type="button" onClick={generateCoverLetter}>↺ {t('regenerate')}</button></div></div>}
              </div>
            </article>
            <div className="coachPro-optimizeWrap"><OptimizeCvCard selected={selected} /></div>
          </div>
        </section>
      </main>
    </div>
  )
}
