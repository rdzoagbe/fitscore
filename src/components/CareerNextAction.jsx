import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './CareerNextAction.css'

function safeScore(item) {
  const candidates = [
    item?.score,
    item?.fitScore,
    item?.matchScore,
    item?.result?.score,
    item?.result?.fitScore,
    item?.result?.overall_score,
    item?.result?.ats_score,
    item?.result_json?.score,
    item?.result_json?.fitScore,
    item?.result_json?.overall_score
  ]

  for (const value of candidates) {
    const number = Number(value)
    if (Number.isFinite(number)) return Math.max(0, Math.min(100, Math.round(number)))
  }
  return null
}

function getLocalAnalyses() {
  if (typeof window === 'undefined') return []

  const keys = [
    'joblytics_analyses',
    'joblytics-analysis-history',
    'analysisHistory',
    'analyses'
  ]

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed?.items)) return parsed.items
      if (Array.isArray(parsed?.analyses)) return parsed.analyses
    } catch (_) {
      // Ignore invalid local storage payloads.
    }
  }

  return []
}

async function countRows(table, userId) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) return { count: 0, available: false }
    return { count: count || 0, available: true }
  } catch (_) {
    return { count: 0, available: false }
  }
}

async function fetchRecentAnalyses(userId) {
  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('id, score, result, result_json, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error || !Array.isArray(data)) return []
    return data
  } catch (_) {
    return []
  }
}

function buildAction({ signedIn, analysisCount, averageScore, coverLetterCount, linkedInCount, applicationCount }) {
  if (!signedIn) {
    return {
      tone: 'trust',
      eyebrow: 'Secure your workspace',
      title: 'Sign in to save your progress',
      body: 'Create an account so your analyses, cover letters, LinkedIn optimizations, and job progress stay available across devices.',
      cta: 'Open account',
      target: 'dashboard',
      secondary: 'Your local tools still work, but saved progress needs an account.'
    }
  }

  if (analysisCount === 0) {
    return {
      tone: 'primary',
      eyebrow: 'First high-value action',
      title: 'Run your first ATS job match',
      body: 'Start by comparing your CV against a real job description. Joblytics can then guide your CV, cover letter, LinkedIn profile, and tracker from that result.',
      cta: 'Analyze a job',
      target: 'analyzer',
      secondary: 'Best starting point for every new application.'
    }
  }

  if (averageScore && averageScore < 72) {
    return {
      tone: 'warning',
      eyebrow: 'Improve before applying',
      title: `Your average match is ${averageScore}%`,
      body: 'Your CV is probably missing important keywords or proof points. Open CV Coach and strengthen the bullets before sending more applications.',
      cta: 'Improve CV',
      target: 'coach',
      secondary: 'Aim for 75%+ before applying to priority roles.'
    }
  }

  if (coverLetterCount === 0) {
    return {
      tone: 'primary',
      eyebrow: 'Application package gap',
      title: 'Generate and save a tailored cover letter',
      body: 'You have analysis activity, but no saved cover letter yet. Create one from your strongest job match and save it to your history.',
      cta: 'Create cover letter',
      target: 'coach',
      secondary: 'A saved letter also completes your cover-letter workflow step.'
    }
  }

  if (linkedInCount === 0) {
    return {
      tone: 'linkedin',
      eyebrow: 'Visibility upgrade',
      title: 'Optimize your LinkedIn profile next',
      body: 'Your CV and cover-letter flow is moving. Now align your headline, About section, and experience with the same target roles.',
      cta: 'Optimize LinkedIn',
      target: 'linkedin',
      secondary: 'Paste-only mode keeps the flow safe and privacy-first.'
    }
  }

  if (applicationCount === 0) {
    return {
      tone: 'success',
      eyebrow: 'Turn work into pipeline',
      title: 'Track your next application',
      body: 'You have assets ready. Save an application with status, company, role, and next follow-up so Joblytics becomes your job-search CRM.',
      cta: 'Open tracker',
      target: 'history',
      secondary: 'The tracker is where the product becomes sticky.'
    }
  }

  return {
    tone: 'success',
    eyebrow: 'Momentum mode',
    title: 'Prepare for the next interview',
    body: 'You have the core workflow moving. Use your saved job analysis to prepare interview answers, questions, and follow-up messages.',
    cta: 'Prepare interview',
    target: 'coach',
    secondary: 'Next upgrade: connect interview prep directly to saved applications.'
  }
}

export default function CareerNextAction({ metrics, setPage }) {
  const { user } = useAuth()
  const [remote, setRemote] = useState({
    loading: true,
    analyses: [],
    coverLetters: 0,
    linkedIn: 0,
    applications: 0
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id) {
        setRemote({ loading: false, analyses: [], coverLetters: 0, linkedIn: 0, applications: 0 })
        return
      }

      const [analyses, coverLetters, linkedIn, applications] = await Promise.all([
        fetchRecentAnalyses(user.id),
        countRows('cover_letters', user.id),
        countRows('linkedin_optimizations', user.id),
        countRows('applications', user.id)
      ])

      if (!cancelled) {
        setRemote({
          loading: false,
          analyses,
          coverLetters: coverLetters.count,
          linkedIn: linkedIn.count,
          applications: applications.count
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const localAnalyses = useMemo(() => getLocalAnalyses(), [])
  const metricAnalyses = Array.isArray(metrics?.analyses) ? metrics.analyses : []
  const mergedAnalyses = remote.analyses.length ? remote.analyses : (metricAnalyses.length ? metricAnalyses : localAnalyses)

  const scores = mergedAnalyses.map(safeScore).filter(value => Number.isFinite(value))
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : Number(metrics?.averageScore || 0) || null

  const analysisCount = Math.max(
    Number(metrics?.analysesCount || 0),
    Array.isArray(mergedAnalyses) ? mergedAnalyses.length : 0
  )

  const action = buildAction({
    signedIn: Boolean(user?.id),
    analysisCount,
    averageScore,
    coverLetterCount: remote.coverLetters,
    linkedInCount: remote.linkedIn,
    applicationCount: remote.applications
  })

  const handleClick = () => {
    if (action.target) setPage?.(action.target)
  }

  return (
    <article className={`careerNextAction careerNextAction--${action.tone}`}>
      <div className="careerNextAction-glow" />
      <div className="careerNextAction-main">
        <p className="careerNextAction-eyebrow">{remote.loading ? 'Checking your workspace…' : action.eyebrow}</p>
        <h2>{action.title}</h2>
        <p>{action.body}</p>
        <div className="careerNextAction-meta">
          <span>{analysisCount} ATS checks</span>
          <span>{remote.coverLetters} letters</span>
          <span>{remote.linkedIn} LinkedIn saves</span>
        </div>
      </div>
      <div className="careerNextAction-side">
        <button type="button" onClick={handleClick}>{action.cta}</button>
        <small>{action.secondary}</small>
      </div>
    </article>
  )
}
