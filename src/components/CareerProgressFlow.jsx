import React, { useEffect, useMemo, useState } from 'react'
import './CareerProgressFlow.css'

function readLocalSignals() {
  if (typeof window === 'undefined') {
    return {
      hasCv: false,
      hasCoverLetter: false,
      hasLinkedIn: false,
      hasTracker: false,
      hasInterview: false
    }
  }

  try {
    const keys = Object.keys(window.localStorage || {})
    const entries = keys.map((key) => {
      let value = ''
      try {
        value = window.localStorage.getItem(key) || ''
      } catch (_) {
        value = ''
      }
      return `${key} ${value.slice(0, 800)}`.toLowerCase()
    })

    const hasSignal = (patterns, minLength = 0) => entries.some((entry) => {
      const matches = patterns.some((pattern) => entry.includes(pattern))
      return matches && entry.length >= minLength
    })

    return {
      hasCv: hasSignal(['cv', 'resume', 'curriculum'], 120),
      hasCoverLetter: hasSignal(['cover_letter', 'cover letter', 'lettre de motivation'], 80),
      hasLinkedIn: hasSignal(['linkedin', 'profile optimization', 'headline'], 80),
      hasTracker: hasSignal(['application', 'tracker', 'applied', 'candidature'], 80),
      hasInterview: hasSignal(['interview', 'entretien', 'prep'], 80)
    }
  } catch (_) {
    return {
      hasCv: false,
      hasCoverLetter: false,
      hasLinkedIn: false,
      hasTracker: false,
      hasInterview: false
    }
  }
}

function getStatusLabel(status) {
  if (status === 'completed') return 'Completed'
  if (status === 'in_progress') return 'In progress'
  return 'Next'
}

function getStepScore(status) {
  if (status === 'completed') return 100
  if (status === 'in_progress') return 55
  return 10
}

function StepItem({ step, index, isNext, onClick }) {
  return (
    <button
      type="button"
      className={`careerFlow-step careerFlow-step--${step.status}${isNext ? ' careerFlow-step--next' : ''}`}
      onClick={onClick}
    >
      <span className="careerFlow-stepIndex">{index + 1}</span>
      <span className="careerFlow-stepBody">
        <strong>{step.title}</strong>
        <small>{step.description}</small>
      </span>
      <span className="careerFlow-status">{isNext ? 'Next action' : getStatusLabel(step.status)}</span>
    </button>
  )
}

export default function CareerProgressFlow({ metrics, usage, setPage }) {
  const [signals, setSignals] = useState(() => readLocalSignals())

  useEffect(() => {
    setSignals(readLocalSignals())
  }, [metrics, usage])

  const analysesCount = Number(metrics?.analysesCount || metrics?.analyses?.length || 0)
  const bestScore = Number(metrics?.bestScore || 0)

  const steps = useMemo(() => {
    const hasAnalysis = analysesCount > 0
    const hasStrongAnalysis = bestScore >= 70

    return [
      {
        id: 'cv',
        title: 'Build your CV base',
        description: 'Upload or paste a CV so every recommendation is grounded in your real profile.',
        status: signals.hasCv || hasAnalysis ? 'completed' : 'in_progress',
        page: 'analyzer'
      },
      {
        id: 'analysis',
        title: 'Run an ATS job match',
        description: 'Compare your CV against a real job description and identify missing keywords.',
        status: hasAnalysis ? 'completed' : 'not_started',
        page: 'analyzer'
      },
      {
        id: 'coach',
        title: 'Improve the CV',
        description: hasStrongAnalysis ? 'Keep refining high-value bullets for stronger recruiter impact.' : 'Turn weak bullets into measurable achievements before applying.',
        status: hasStrongAnalysis ? 'completed' : hasAnalysis ? 'in_progress' : 'not_started',
        page: 'coach'
      },
      {
        id: 'cover',
        title: 'Generate a tailored cover letter',
        description: 'Create a targeted letter from the job analysis instead of starting from zero.',
        status: signals.hasCoverLetter ? 'completed' : hasAnalysis ? 'in_progress' : 'not_started',
        page: 'analyzer'
      },
      {
        id: 'linkedin',
        title: 'Optimize LinkedIn',
        description: 'Paste your public profile sections and make your headline/About recruiter-ready.',
        status: signals.hasLinkedIn ? 'completed' : hasAnalysis ? 'in_progress' : 'not_started',
        page: 'linkedin'
      },
      {
        id: 'tracker',
        title: 'Track the application',
        description: 'Save the company, role, score, status, notes, and follow-up date.',
        status: signals.hasTracker ? 'completed' : hasAnalysis ? 'in_progress' : 'not_started',
        page: 'history'
      },
      {
        id: 'interview',
        title: 'Prepare the interview',
        description: 'Use the job context to prepare likely questions, stories, and negotiation points.',
        status: signals.hasInterview ? 'completed' : signals.hasTracker ? 'in_progress' : 'not_started',
        page: 'coach'
      }
    ]
  }, [analysesCount, bestScore, signals])

  const nextStep = steps.find((step) => step.status !== 'completed') || steps[steps.length - 1]
  const progress = Math.round(steps.reduce((sum, step) => sum + getStepScore(step.status), 0) / steps.length)
  const completed = steps.filter((step) => step.status === 'completed').length

  return (
    <section className="careerFlow-card" aria-label="Career progress flow">
      <div className="careerFlow-header">
        <div>
          <p className="careerFlow-kicker">Career operating system</p>
          <h2>Your job-search workflow</h2>
          <p>
            Follow the sequence from CV foundation to interview preparation. Joblytics will keep showing the next best action as your data grows.
          </p>
        </div>

        <div className="careerFlow-score" aria-label={`${progress}% workflow progress`}>
          <strong>{progress}%</strong>
          <span>{completed}/{steps.length} complete</span>
        </div>
      </div>

      <div className="careerFlow-next">
        <span>Next best action</span>
        <strong>{nextStep.title}</strong>
        <p>{nextStep.description}</p>
        <button type="button" onClick={() => setPage?.(nextStep.page)}>
          Continue →
        </button>
      </div>

      <div className="careerFlow-track" style={{ '--career-flow-progress': `${progress}%` }}>
        <span />
      </div>

      <div className="careerFlow-steps">
        {steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            index={index}
            isNext={step.id === nextStep.id && step.status !== 'completed'}
            onClick={() => setPage?.(step.page)}
          />
        ))}
      </div>
    </section>
  )
}
