import React, { useEffect, useMemo, useState } from 'react'
import { useLang } from '../context/LangContext'

const STORE_KEY = 'joblytics_communication_assets_v1'

function clean(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function list(values = [], limit = 6) {
  return Array.isArray(values) ? values.filter(Boolean).map(v => typeof v === 'string' ? v : v?.text || v?.label || '').filter(Boolean).slice(0, limit) : []
}

function getContext(selected) {
  const r = selected?.result || {}
  const ctx = r.job_context || {}
  const title = clean(ctx.title || selected?.job_title, 'the role')
  const company = clean(ctx.company, 'your company')
  const edges = list(r.interview_prep?.your_edges, 4)
  const wins = list(r.quick_wins, 4)
  const found = list(r.keyword_match?.found, 8)
  const gaps = list(r.critical_gaps, 4)
  const score = Number(selected?.score || r.display_score || r.match_probability || 0)
  return {
    title,
    company,
    location: clean(ctx.location, ''),
    contract: clean(ctx.contract_type, ''),
    score: Number.isFinite(score) ? Math.round(score) : 0,
    edges,
    wins,
    found,
    gaps,
    summary: clean(r.job_summary, ''),
    nextAction: clean(r.next_best_action?.label || r.next_best_action?.reason, '')
  }
}

function loadAssets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveAssets(all) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all || {})) } catch {}
}

function sentenceJoin(items = [], fallback = '') {
  const cleaned = items.filter(Boolean)
  if (!cleaned.length) return fallback
  if (cleaned.length === 1) return cleaned[0]
  return `${cleaned.slice(0, -1).join(', ')} and ${cleaned[cleaned.length - 1]}`
}

function buildAsset({ type, tone, language, context, recruiterName, userName }) {
  const name = clean(userName, '[Your name]')
  const person = clean(recruiterName, language === 'fr' ? 'Bonjour' : 'Hello')
  const role = context.title
  const company = context.company
  const edge = sentenceJoin(context.edges.slice(0, 2), context.found.slice(0, 3).join(', ') || 'relevant experience for the role')
  const keywords = context.found.slice(0, 4).join(', ')
  const gapLine = context.gaps.length ? `I have also noted the importance of ${context.gaps[0]} and would be happy to clarify how my background connects to this requirement.` : ''

  const isFr = language === 'fr'
  const warmClose = isFr ? 'Au plaisir d’échanger avec vous,' : 'Best regards,'
  const directClose = isFr ? 'Cordialement,' : 'Kind regards,'
  const close = tone === 'warm' ? warmClose : directClose

  if (type === 'recruiter') {
    return isFr
      ? `${person},\n\nJe me permets de vous contacter au sujet du poste ${role} chez ${company}. Mon parcours semble aligné avec plusieurs attentes du poste, notamment ${edge}.\n\nJe serais ravi d’échanger brièvement pour mieux comprendre les priorités du rôle et voir comment mon expérience peut répondre à vos besoins.\n\n${close}\n${name}`
      : `${person},\n\nI am reaching out regarding the ${role} position at ${company}. My background appears aligned with several key expectations for the role, particularly ${edge}.\n\nI would be glad to have a short conversation to better understand the role priorities and discuss how my experience could support your needs.\n\n${close}\n${name}`
  }

  if (type === 'followup') {
    return isFr
      ? `${person},\n\nJe me permets de faire suite à ma candidature pour le poste ${role} chez ${company}. Je reste très intéressé par cette opportunité et par la possibilité de contribuer sur les sujets liés à ${keywords || 'les responsabilités du poste'}.\n\nJe serais ravi d’avoir un retour sur les prochaines étapes du processus lorsque cela sera possible.\n\n${close}\n${name}`
      : `${person},\n\nI wanted to follow up on my application for the ${role} position at ${company}. I remain very interested in the opportunity and in contributing to areas such as ${keywords || 'the responsibilities described in the role'}.\n\nI would be grateful for any update on the next steps whenever convenient.\n\n${close}\n${name}`
  }

  if (type === 'thankyou') {
    return isFr
      ? `${person},\n\nMerci encore pour notre échange concernant le poste ${role}. J’ai particulièrement apprécié mieux comprendre les priorités du rôle et les attentes de ${company}.\n\nNotre discussion a renforcé mon intérêt pour le poste, notamment sur les sujets où mon expérience en ${edge} peut apporter une contribution concrète.\n\n${close}\n${name}`
      : `${person},\n\nThank you again for taking the time to discuss the ${role} position with me. I appreciated learning more about the priorities of the role and the expectations at ${company}.\n\nOur conversation reinforced my interest, especially in areas where my experience in ${edge} can bring practical value.\n\n${close}\n${name}`
  }

  if (type === 'linkedin') {
    return isFr
      ? `Bonjour ${clean(recruiterName, '')}, je viens de postuler au poste ${role} chez ${company}. Mon expérience semble bien alignée avec ${edge}. Je serais ravi d’échanger brièvement si mon profil retient votre attention.`
      : `Hi ${clean(recruiterName, '')}, I recently applied for the ${role} role at ${company}. My experience appears well aligned with ${edge}. I would be glad to connect briefly if my profile is of interest.`
  }

  if (type === 'gap') {
    return isFr
      ? `Point à clarifier en entretien : ${gapLine || `Je peux expliquer comment mon expérience se rapproche des attentes du poste ${role}, même si certains éléments ne sont pas explicitement visibles dans mon CV.`}`
      : `Interview clarification point: ${gapLine || `I can explain how my experience connects to the ${role} requirements, even where some elements are not explicitly visible in my CV.`}`
  }

  return isFr
    ? `${person},\n\nJe vous contacte concernant le poste ${role} chez ${company}. Mon expérience semble pertinente pour ce rôle, notamment ${edge}.\n\n${close}\n${name}`
    : `${person},\n\nI am contacting you regarding the ${role} position at ${company}. My experience appears relevant to this role, particularly ${edge}.\n\n${close}\n${name}`
}

const ASSET_TYPES = [
  { value: 'recruiter', icon: '🤝', label: 'Recruiter outreach', hint: 'Before or after applying' },
  { value: 'followup', icon: '🔔', label: 'Application follow-up', hint: '3–5 business days later' },
  { value: 'thankyou', icon: '🙏', label: 'Interview thank-you', hint: 'After an interview' },
  { value: 'linkedin', icon: '💬', label: 'LinkedIn short note', hint: 'Short social message' },
  { value: 'gap', icon: '🛡️', label: 'Gap explanation', hint: 'Prepare honest clarification' }
]

export default function CommunicationAssetsCard({ selected }) {
  const { t, lang } = useLang()
  const [type, setType] = useState('recruiter')
  const [tone, setTone] = useState('professional')
  const [language, setLanguage] = useState(lang || 'en')
  const [recruiterName, setRecruiterName] = useState('')
  const [userName, setUserName] = useState('')
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState({})

  const context = useMemo(() => getContext(selected), [selected])
  const analysisId = selected?.id || 'current'
  const savedForJob = saved[analysisId] || []

  useEffect(() => setSaved(loadAssets()), [])
  useEffect(() => {
    if (selected?.result?.job_context?.hiring_contact) setRecruiterName(selected.result.job_context.hiring_contact)
    setDraft('')
  }, [analysisId])

  const generate = () => {
    const next = buildAsset({ type, tone, language, context, recruiterName, userName })
    setDraft(next)
    setCopied(false)
  }

  const copy = async () => {
    if (!draft) return
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const save = () => {
    if (!draft) return
    const item = {
      id: `${Date.now()}`,
      type,
      tone,
      language,
      text: draft,
      title: ASSET_TYPES.find(item => item.value === type)?.label || 'Message',
      createdAt: new Date().toISOString(),
      jobTitle: context.title,
      company: context.company
    }
    const next = { ...saved, [analysisId]: [item, ...(saved[analysisId] || [])].slice(0, 10) }
    setSaved(next)
    saveAssets(next)
  }

  if (!selected?.result) return null

  return (
    <section className="commAssets-card">
      <div className="commAssets-head">
        <div>
          <p>{t('phase6_kicker', 'Phase 6 · Communication assets')}</p>
          <h2>{t('phase6_title', 'Generate job-specific messages')}</h2>
          <span>{t('phase6_desc', 'Create recruiter outreach, follow-ups, thank-you notes and honest gap explanations using the selected job analysis.')}</span>
        </div>
        <strong>{context.score}% match</strong>
      </div>

      <div className="commAssets-context">
        <div><span>Target job</span><strong>{context.title}</strong><p>{context.company}</p></div>
        <div><span>Strongest angle</span><strong>{context.edges[0] || context.found[0] || 'Relevant experience'}</strong><p>{context.nextAction || 'Use the analysis to position your message.'}</p></div>
        <div><span>Careful point</span><strong>{context.gaps[0] || 'No critical gap flagged'}</strong><p>Do not invent experience. Clarify only what is true.</p></div>
      </div>

      <div className="commAssets-builder">
        <div className="commAssets-controls">
          <label><span>Your name</span><input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Roland Dzoagbe" /></label>
          <label><span>Recruiter/contact</span><input value={recruiterName} onChange={e => setRecruiterName(e.target.value)} placeholder="Hiring Manager" /></label>
          <label><span>Language</span><select value={language} onChange={e => setLanguage(e.target.value)}><option value="en">English</option><option value="fr">Français</option></select></label>
          <label><span>Tone</span><select value={tone} onChange={e => setTone(e.target.value)}><option value="professional">Professional</option><option value="warm">Warm</option><option value="direct">Direct</option></select></label>
        </div>

        <div className="commAssets-types">
          {ASSET_TYPES.map(item => (
            <button key={item.value} type="button" className={type === item.value ? 'is-active' : ''} onClick={() => setType(item.value)}>
              <b>{item.icon}</b><span>{item.label}</span><em>{item.hint}</em>
            </button>
          ))}
        </div>

        <button type="button" className="commAssets-generate" onClick={generate}>Generate message</button>
      </div>

      {draft && (
        <div className="commAssets-draft">
          <div className="commAssets-draftHead"><strong>Generated draft</strong><div><button type="button" onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button><button type="button" onClick={save}>Save asset</button></div></div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={type === 'linkedin' || type === 'gap' ? 5 : 10} />
          <p>Review before sending. The draft is grounded in the analysis, but you must remove anything that is not true.</p>
        </div>
      )}

      <div className="commAssets-saved">
        <div><strong>Saved assets for this job</strong><span>{savedForJob.length ? `${savedForJob.length} saved` : 'No saved messages yet'}</span></div>
        {savedForJob.length > 0 && <div className="commAssets-savedList">{savedForJob.map(item => <button key={item.id} type="button" onClick={() => { setType(item.type); setLanguage(item.language); setTone(item.tone); setDraft(item.text) }}><strong>{item.title}</strong><span>{new Date(item.createdAt).toLocaleString()}</span></button>)}</div>}
      </div>
    </section>
  )
}
