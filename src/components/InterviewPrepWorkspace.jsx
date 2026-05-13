import React, { useMemo, useState } from 'react'
import './InterviewPrepWorkspace.css'

function scoreValue(analysis) {
  const score = Number(analysis?.score ?? analysis?.result?.display_score)
  return Number.isFinite(score) ? Math.round(score) : 0
}

function getTitle(analysis) {
  return analysis?.job_title || analysis?.result?.job_context?.title || 'Selected role'
}

function getCompany(analysis) {
  const company = analysis?.result?.job_context?.company
  return company && company !== 'Not specified' ? company : 'Target company'
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function buildFallbackQuestions(analysis) {
  const result = analysis?.result || {}
  const hard = asArray(result.requirements_match?.matched_hard_requirements).slice(0, 3)
  const missing = asArray(result.missing_keywords).slice(0, 4)
  const title = getTitle(analysis)
  const questions = [
    `Walk me through your experience that best matches the ${title} role.`,
    'Which achievement in your CV is most relevant for this position, and why?',
    'How do you prioritize incidents, stakeholders, and delivery pressure when everything is urgent?',
    'Tell me about a time you improved an IT process, SLA, or operational KPI.'
  ]
  hard.forEach(item => questions.push(`Can you give a concrete example of your experience with ${String(item).replace(/[.!]$/,'')}?`))
  missing.forEach(item => questions.push(`This role mentions ${String(item).replace(/[.!]$/,'')}. How would you cover that gap or ramp up quickly?`))
  return Array.from(new Set(questions)).slice(0, 8)
}

function buildInterviewKit(analysis) {
  const result = analysis?.result || {}
  const prep = result.interview_prep || {}
  const questions = asArray(prep.likely_questions).length ? asArray(prep.likely_questions) : buildFallbackQuestions(analysis)
  const edges = asArray(prep.your_edges).length
    ? asArray(prep.your_edges)
    : asArray(result.strengths).concat(asArray(result.quick_wins).slice(0, 2)).slice(0, 5)
  const weak = asArray(prep.weak_spots).length
    ? asArray(prep.weak_spots).map(item => typeof item === 'string' ? item : `${item.area || 'Weak spot'}${item.prep_tip ? ` — ${item.prep_tip}` : ''}`)
    : asArray(result.gaps || result.missing_keywords).slice(0, 5)
  const keywords = asArray(result.missing_keywords).slice(0, 10)
  const context = result.job_context || {}
  const score = scoreValue(analysis)
  const recommendation = score >= 75
    ? 'Strong match: focus on proof, quantified results, and closing confidently.'
    : score >= 60
      ? 'Close match: prepare gap answers and strengthen the examples that match the core requirements.'
      : 'Lower match: prepare a clear positioning story and address the biggest requirement gaps proactively.'

  return {
    title: getTitle(analysis),
    company: getCompany(analysis),
    location: context.location,
    score,
    recommendation,
    questions,
    edges,
    weak,
    keywords,
    salary: result.salary_assessment?.summary || result.salary_assessment?.range || prep.salary_negotiation_hint || '',
    created: analysis?.created_at
  }
}

function kitToText(kit) {
  const lines = []
  lines.push(`Interview preparation — ${kit.title}`)
  lines.push(`Company: ${kit.company}`)
  if (kit.location) lines.push(`Location: ${kit.location}`)
  lines.push(`Match score: ${kit.score}%`)
  lines.push('')
  lines.push(`Strategy: ${kit.recommendation}`)
  lines.push('')
  lines.push('Likely questions')
  kit.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`))
  lines.push('')
  lines.push('Your strongest proof points')
  ;(kit.edges.length ? kit.edges : ['Prepare 2-3 quantified examples from your recent IT leadership experience.']).forEach((item, i) => lines.push(`${i + 1}. ${item}`))
  lines.push('')
  lines.push('Weak spots to prepare')
  ;(kit.weak.length ? kit.weak : ['Prepare a concise answer for any requirement not clearly visible in your CV.']).forEach((item, i) => lines.push(`${i + 1}. ${item}`))
  if (kit.keywords.length) {
    lines.push('')
    lines.push(`Keywords to mention naturally: ${kit.keywords.join(', ')}`)
  }
  if (kit.salary) {
    lines.push('')
    lines.push(`Salary / negotiation note: ${kit.salary}`)
  }
  return lines.join('\n')
}

export default function InterviewPrepWorkspace({ analyses = [], onSelectAnalysis }) {
  const usableAnalyses = useMemo(() => (
    analyses
      .filter(item => item?.result)
      .sort((a, b) => scoreValue(b) - scoreValue(a))
  ), [analyses])

  const [selectedId, setSelectedId] = useState(null)
  const selected = useMemo(() => {
    if (!usableAnalyses.length) return null
    return usableAnalyses.find(item => item.id === selectedId) || usableAnalyses[0]
  }, [usableAnalyses, selectedId])

  const kit = useMemo(() => selected ? buildInterviewKit(selected) : null, [selected])
  const [copied, setCopied] = useState(false)

  if (!usableAnalyses.length || !kit) return null

  const copyKit = async () => {
    try {
      await navigator.clipboard.writeText(kitToText(kit))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const downloadKit = () => {
    const blob = new Blob([kitToText(kit)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-prep-${kit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'role'}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="interviewPrepWorkspace historyWide-card">
      <div className="interviewPrepWorkspace-head">
        <div>
          <p className="historyWide-kicker">Interview readiness</p>
          <h2>Prepare from your strongest job match</h2>
          <p>Turn a saved ATS analysis into likely questions, proof points, gap answers, and a quick interview strategy.</p>
        </div>
        <div className="interviewPrepWorkspace-score">
          <strong>{kit.score}%</strong>
          <span>match</span>
        </div>
      </div>

      <div className="interviewPrepWorkspace-toolbar">
        <label>
          <span>Role to prepare</span>
          <select value={selected?.id || ''} onChange={event => setSelectedId(event.target.value)}>
            {usableAnalyses.slice(0, 20).map(item => (
              <option key={item.id} value={item.id}>{scoreValue(item)}% · {getTitle(item)} · {getCompany(item)}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => onSelectAnalysis?.(selected)}>Open analysis</button>
        <button type="button" onClick={copyKit}>{copied ? 'Copied' : 'Copy kit'}</button>
        <button type="button" onClick={downloadKit}>Download .txt</button>
      </div>

      <div className="interviewPrepWorkspace-strategy">
        <strong>{kit.title}</strong>
        <span>@ {kit.company}</span>
        <p>{kit.recommendation}</p>
      </div>

      <div className="interviewPrepWorkspace-grid">
        <article>
          <h3>Likely questions</h3>
          <ol>
            {kit.questions.slice(0, 6).map((q, index) => <li key={`${q}-${index}`}>{q}</li>)}
          </ol>
        </article>
        <article>
          <h3>Proof points to lead with</h3>
          {(kit.edges.length ? kit.edges : ['Prepare 2-3 quantified examples: SLA improvement, cost reduction, team leadership, migration delivery.']).slice(0, 5).map((item, index) => <p key={`${item}-${index}`}>✓ {item}</p>)}
        </article>
        <article>
          <h3>Gaps to prepare</h3>
          {(kit.weak.length ? kit.weak : ['Prepare a concise bridge answer for each requirement not clearly visible in your CV.']).slice(0, 5).map((item, index) => <p key={`${item}-${index}`}>⚠ {item}</p>)}
        </article>
      </div>

      {kit.keywords.length > 0 && (
        <div className="interviewPrepWorkspace-keywords">
          {kit.keywords.slice(0, 10).map(keyword => <span key={keyword}>{keyword}</span>)}
        </div>
      )}
    </section>
  )
}
