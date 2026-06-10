import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../utils/deviceId'
import { trackEvent, trackError } from '../utils/productAnalytics'

function friendlyAnalyzeError(error, responseStatus, serverMessage, payload = null) {
  if (responseStatus === 504 || responseStatus === 524) {
    return 'The analysis took too long. Paste a shorter version of the job offer, ideally the mission, requirements, and skills sections only.'
  }

  if (responseStatus === 401) return serverMessage || 'Please sign in again to continue.'
  if (responseStatus === 429) return serverMessage || "You've reached your plan limit. Upgrade to continue."
  if (responseStatus >= 500) return 'The analysis service is temporarily unavailable. Try again in a moment, or switch to Paste mode with a shorter job description.'

  if (responseStatus >= 400) {
    const reasons = payload?.quality?.reasons
    const provider = payload?.quality?.extractionProvider
    const suffix = Array.isArray(reasons) && reasons.length
      ? `\n\nWhy: ${reasons.join(' ')}${provider ? `\nExtraction: ${provider}` : ''}`
      : ''
    return `${serverMessage || 'The job or CV could not be analyzed. Check the file and job text, then try again.'}${suffix}`
  }

  if (error?.name === 'AbortError') return 'The analysis timed out. Paste a shorter job description and try again.'

  const raw = error?.message || ''
  const lower = raw.toLowerCase()
  if (lower.includes('failed to read file')) return 'The CV file could not be read. Try uploading a PDF or Word document again.'
  if (lower.includes('invalid response')) return 'The server returned an incomplete result. Try again, or use Paste mode with a shorter job description.'
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Network connection failed. Check your internet connection and try again.'
  if (lower.includes('stream ended') || lower.includes('stream ended unexpectedly')) return 'The analysis took too long to complete. Try again with a shorter job description, or switch to Paste mode.'
  return raw || 'Analysis failed. Please try again.'
}

function scoreValue(analysis) {
  const score = Number(analysis?.display_score ?? analysis?.match_probability ?? 0)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
}

function getAnalysisTitle(analysis) {
  return analysis?.job_context?.job_title || analysis?.job_context?.title || analysis?.job_title || 'Job analysis'
}

async function makeClientCacheKey({ userId, jobUrl, jobText, cvFileName }) {
  const raw = ['client-save-v1', userId || '', jobUrl || 'manual_paste', jobText || '', cvFileName || ''].join('||')
  try {
    const bytes = new TextEncoder().encode(raw)
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

async function saveAnalysisClientSide({ user, analysis, jobUrl, jobText, cvFile }) {
  if (!user?.id || !analysis) return null

  const cacheKey = await makeClientCacheKey({
    userId: user.id,
    jobUrl: jobUrl || null,
    jobText: jobText || null,
    cvFileName: cvFile?.name || null
  })

  const basePayload = {
    user_id: user.id,
    job_url: jobUrl || 'manual_paste',
    job_title: getAnalysisTitle(analysis),
    score: scoreValue(analysis),
    result: analysis,
    cv_file_path: null,
    cv_file_name: cvFile?.name || null,
    cache_key: cacheKey
  }

  try {
    const { data: existing } = await supabase.from('analyses').select('id').eq('user_id', user.id).eq('cache_key', cacheKey).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (existing?.id) {
      const { data, error } = await supabase.from('analyses').update(basePayload).eq('id', existing.id).select().single()
      if (error) throw error
      return data || null
    }
    const { data, error } = await supabase.from('analyses').insert(basePayload).select().single()
    if (error) throw error
    return data || null
  } catch (error) {
    console.warn('Client-side analysis save failed:', error?.message || error)
    try {
      const { cache_key, ...payloadWithoutCacheKey } = basePayload
      const { data, error: insertError } = await supabase.from('analyses').insert(payloadWithoutCacheKey).select().single()
      if (insertError) throw insertError
      return data || null
    } catch (secondError) {
      console.warn('Client-side analysis fallback save failed:', secondError?.message || secondError)
      return null
    }
  }
}

export function useAnalyze() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null, savedRow: null, rateLimit: null, streamProgress: 0 })
  const { user, session } = useAuth()

  const analyze = async (jobUrl, cvFile, jobText = null) => {
    const mode = jobText ? 'paste' : jobUrl ? 'url' : 'unknown'
    trackEvent('analysis_started', { mode, hasCv: !!cvFile, jobChars: jobText?.length || 0 })
    setState({ status: 'loading', data: null, error: null, savedRow: null, rateLimit: null, planLimit: null, streamProgress: 0 })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 65000)

    try {
      const cvBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(cvFile)
      })

      const body = JSON.stringify({
        jobUrl: jobUrl || null,
        jobText: jobText || null,
        cvBase64,
        cvMimeType: cvFile.type,
        cvFileName: cvFile.name,
        userId: user?.id || null
      })
      const headers = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        'X-Joblytics-Device-Id': getDeviceId()
      }

      const res = await fetch('/api/analyze-accurate', { method: 'POST', headers, body, signal: controller.signal })
      clearTimeout(timeoutId)
      const contentType = res.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let charsReceived = 0

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            let event
            try { event = JSON.parse(line.slice(6)) } catch { continue }

            if (event.t === 'd') {
              charsReceived += (event.c || '').length
              const progress = Math.min(90, 10 + Math.round((charsReceived / 1800) * 80))
              setState(prev => ({ ...prev, streamProgress: progress }))
            } else if (event.t === 'status') {
              setState(prev => ({ ...prev, streamProgress: event.msg === 'analyzing' ? 15 : 5 }))
            } else if (event.t === 'done') {
              let savedRow = event.savedRow || null
              if (!savedRow && user?.id) savedRow = await saveAnalysisClientSide({ user, analysis: event.analysis, jobUrl: jobUrl || null, jobText: jobText || null, cvFile })
              trackEvent('analysis_completed', { mode, score: event.analysis?.display_score || 0, saved: !!savedRow, streamed: true })
              setState({ status: 'done', data: event.analysis, error: null, savedRow, rateLimit: event.rateLimit || null, planLimit: event.planLimit || null, streamProgress: 100 })
              return
            } else if (event.t === 'err') {
              throw new Error(friendlyAnalyzeError(null, event.status, event.error, event))
            }
          }
        }
        throw new Error('Analysis stream ended unexpectedly. Please try again.')
      }

      let data = null
      if (contentType.includes('application/json')) {
        try { data = await res.json() } catch {}
      }
      if (!res.ok) {
        console.warn('[Joblytics analyze debug]', data)
        throw new Error(friendlyAnalyzeError(null, res.status, data?.error, data))
      }
      if (!data?.analysis) throw new Error('Invalid response from server. Please try again.')

      let savedRow = data.savedRow || null
      if (!savedRow && user?.id) savedRow = await saveAnalysisClientSide({ user, analysis: data.analysis, jobUrl: jobUrl || null, jobText: jobText || null, cvFile })
      trackEvent('analysis_completed', { mode, score: data.analysis?.display_score || 0, saved: !!savedRow })
      setState({ status: 'done', data: data.analysis, error: null, savedRow, rateLimit: data.rateLimit || null, planLimit: data.planLimit || null, streamProgress: 100 })
    } catch (e) {
      clearTimeout(timeoutId)
      const friendly = friendlyAnalyzeError(e)
      trackError('analysis_failed', e, { mode, friendly })
      setState({ status: 'error', data: null, error: friendly, savedRow: null, rateLimit: null, streamProgress: 0 })
    }
  }

  const reset = () => setState({ status: 'idle', data: null, error: null, savedRow: null, rateLimit: null, planLimit: null, streamProgress: 0 })
  return { ...state, analyze, reset }
}
