import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../utils/analytics'

export function useAnalyze() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null, savedRow: null, rateLimit: null })
  const { user } = useAuth()

  // jobUrl OR jobText — one must be provided
  const analyze = async (jobUrl, cvFile, jobText = null) => {
    setState({ status: 'loading', data: null, error: null, savedRow: null, rateLimit: null })
    trackEvent('analysis_started', { source: jobText ? 'paste' : 'url', has_cv: !!cvFile })

    // Client-side timeout matches Vercel hobby cap (60s)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 65000)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken || !user?.id) {
        throw new Error('Please sign in again before running an analysis.')
      }

      const cvBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(cvFile)
      })

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          jobUrl: jobUrl || null,
          jobText: jobText || null,
          cvBase64,
          cvMimeType: cvFile.type,
          cvFileName: cvFile.name,
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
        // Specific error for timeout
        if (res.status === 504 || res.status === 524) {
          throw new Error('The analysis took too long and timed out. This usually happens with very long job descriptions. Try a shorter version (just the key requirements section).')
        }
        // Specific error for rate limit
        if (res.status === 429) {
          throw new Error(data?.error || "You've reached your daily limit. Try again tomorrow or join the waitlist for unlimited access.")
        }
        throw new Error(data?.error || `Server error (${res.status}). Please try again in a moment.`)
      }

      if (!data || !data.analysis) {
        throw new Error('Invalid response from server. Please try again.')
      }

      trackEvent('analysis_completed', {
        score: data.analysis.display_score ?? null,
        verdict: data.analysis.overall_verdict || null,
        source: jobText ? 'paste' : 'url',
        cached: !!data.cached
      })

      setState({
        status: 'done',
        data: data.analysis,
        error: null,
        savedRow: data.savedRow || null,
        rateLimit: data.rateLimit || null
      })
    } catch (e) {
      clearTimeout(timeoutId)
      const msg = e.name === 'AbortError'
        ? 'The analysis timed out. Try a shorter job description.'
        : (e.message || 'Analysis failed. Please try again.')
      trackEvent('analysis_failed', { reason: msg.slice(0, 160) })
      setState({ status: 'error', data: null, error: msg, savedRow: null, rateLimit: null })
    }
  }

  const reset = () => setState({ status: 'idle', data: null, error: null, savedRow: null, rateLimit: null })
  return { ...state, analyze, reset }
}
