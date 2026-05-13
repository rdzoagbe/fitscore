import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../utils/analytics'

function buildLimitError(data, fallback) {
  const usage = data?.usage || data?.rateLimit
  if (!data?.rate_limited && !usage) return { message: fallback, details: null }

  const action = usage?.action || 'analysis'
  const plan = usage?.planLabel || data?.rateLimit?.planLabel || 'current plan'
  const used = usage?.used ?? data?.rateLimit?.analysisUsed
  const limit = usage?.limit ?? data?.rateLimit?.analysisLimit

  const message = action === 'cover letter'
    ? `You’ve reached your ${plan} cover letter limit.`
    : `You’ve reached your ${plan} ATS analysis limit.`

  return {
    message,
    details: {
      type: 'limit',
      action,
      plan,
      used,
      limit,
      reason: data?.reason || 'limit_reached',
      original: data?.error || fallback
    }
  }
}

export function useAnalyze() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null, errorDetails: null, savedRow: null, rateLimit: null })
  const { user } = useAuth()

  // jobUrl OR jobText — one must be provided. cvFile OR cvVersion must be provided.
  const analyze = async (jobUrl, cvFile, jobText = null, cvVersion = null) => {
    setState({ status: 'loading', data: null, error: null, errorDetails: null, savedRow: null, rateLimit: null })
    const cvTextDirect = cvVersion?.cvText || cvVersion?.cv_text || null
    const usingCvVersion = Boolean(cvTextDirect && String(cvTextDirect).trim().length > 50)
    trackEvent('analysis_started', { source: jobText ? 'paste' : 'url', has_cv: !!cvFile || usingCvVersion, cv_source: usingCvVersion ? 'vault' : 'upload' })

    // Client-side timeout matches Vercel hobby cap (60s)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 65000)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken || !user?.id) {
        throw new Error('Please sign in again before running an analysis.')
      }

      let cvBase64 = null
      let cvMimeType = null
      let cvFileName = cvVersion?.cvFileName || cvVersion?.cvVersionLabel || null

      if (!usingCvVersion) {
        if (!cvFile) throw new Error('Please upload a CV or select an active CV version before running the analysis.')
        cvBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(cvFile)
        })
        cvMimeType = cvFile.type
        cvFileName = cvFile.name
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({
          jobUrl: jobUrl || null,
          jobText: jobText || null,
          cvBase64,
          cvMimeType,
          cvFileName,
          cvTextDirect: usingCvVersion ? String(cvTextDirect).slice(0, 9000) : null,
          cvVersionId: usingCvVersion ? (cvVersion?.cvVersionId || cvVersion?.id || null) : null,
          cvVersionLabel: usingCvVersion ? (cvVersion?.cvVersionLabel || cvVersion?.label || cvFileName || 'Active CV version') : null,
          userId: user.id
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Handle non-JSON responses gracefully (504 from Vercel returns HTML)
      let data = null
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try { data = await res.json() } catch {}
      }

      if (!res.ok) {
        if (res.status === 504 || res.status === 524) {
          throw new Error('The analysis took too long and timed out. This usually happens with very long job descriptions. Try a shorter version (just the key requirements section).')
        }
        if (res.status === 429) {
          const limitError = buildLimitError(data, data?.error || "You've reached your plan limit.")
          const err = new Error(limitError.message)
          err.details = limitError.details
          throw err
        }
        throw new Error(data?.error || ('Server error (' + res.status + '). Please try again in a moment.'))
      }

      if (!data || !data.analysis) {
        throw new Error('Invalid response from server. Please try again.')
      }

      trackEvent('analysis_completed', {
        score: data.analysis.display_score ?? null,
        verdict: data.analysis.overall_verdict || null,
        source: jobText ? 'paste' : 'url',
        cv_source: usingCvVersion ? 'vault' : 'upload',
        cached: !!data.cached
      })

      setState({
        status: 'done',
        data: data.analysis,
        error: null,
        errorDetails: null,
        savedRow: data.savedRow || null,
        rateLimit: data.rateLimit || null
      })
    } catch (e) {
      clearTimeout(timeoutId)
      const msg = e.name === 'AbortError'
        ? 'The analysis timed out. Try a shorter job description.'
        : (e.message || 'Analysis failed. Please try again.')
      trackEvent('analysis_failed', { reason: msg.slice(0, 160), type: e.details?.type || 'generic' })
      setState({ status: 'error', data: null, error: msg, errorDetails: e.details || null, savedRow: null, rateLimit: null })
    }
  }

  const reset = () => setState({ status: 'idle', data: null, error: null, errorDetails: null, savedRow: null, rateLimit: null })
  return { ...state, analyze, reset }
}
