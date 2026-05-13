import React, { useEffect, useState } from 'react'
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
                  <h2>Saved letters</h2>
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
      </main>
    </div>
  )
}
