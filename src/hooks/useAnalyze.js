import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getDeviceId } from '../utils/deviceId'

function friendlyAnalyzeError(error, responseStatus, serverMessage) {
  if (responseStatus === 504 || responseStatus === 524) {
    return 'The analysis took too long. Paste a shorter version of the job offer, ideally the mission, requirements, and skills sections only.'
  }

  if (responseStatus === 401) {
    return serverMessage || 'Please sign in again to continue.'
  }

  if (responseStatus === 429) {
    return serverMessage || "You've reached your plan limit. Upgrade to continue."
  }

  if (responseStatus >= 500) {
    return 'The analysis service is temporarily unavailable. Try again in a moment, or switch to Paste mode with a shorter job description.'
  }

  if (responseStatus >= 400) {
    return serverMessage || 'The job or CV could not be analyzed. Check the file and job text, then try again.'
  }

  if (error?.name === 'AbortError') {
    return 'The analysis timed out. Paste a shorter job description and try again.'
  }

  const raw = error?.message || ''
  const lower = raw.toLowerCase()

  if (lower.includes('failed to read file')) {
    return 'The CV file could not be read. Try uploading a PDF or Word document again.'
  }

  if (lower.includes('invalid response')) {
    return 'The server returned an incomplete result. Try again, or use Paste mode with a shorter job description.'
  }

  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Network connection failed. Check your internet connection and try again.'
  }

  return raw || 'Analysis failed. Please try again.'
}

export function useAnalyze() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null, savedRow: null, rateLimit: null })
  const { user, session } = useAuth()

  // jobUrl OR jobText — one must be provided
  const analyze = async (jobUrl, cvFile, jobText = null) => {
    setState({ status: 'loading', data: null, error: null, savedRow: null, rateLimit: null })

    // Client-side timeout matches Vercel hobby cap (60s)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 65000)

    try {
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
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          'X-Joblytics-Device-Id': getDeviceId()
        },
        body: JSON.stringify({
          jobUrl: jobUrl || null,
          jobText: jobText || null,
          cvBase64,
          cvMimeType: cvFile.type,
          cvFileName: cvFile.name,
          userId: user?.id || null
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
        throw new Error(friendlyAnalyzeError(null, res.status, data?.error))
      }

      if (!data || !data.analysis) {
        throw new Error('Invalid response from server. Please try again.')
      }

      setState({
        status: 'done',
        data: data.analysis,
        error: null,
        savedRow: data.savedRow || null,
        rateLimit: data.rateLimit || null
      })
    } catch (e) {
      clearTimeout(timeoutId)
      setState({ status: 'error', data: null, error: friendlyAnalyzeError(e), savedRow: null, rateLimit: null })
    }
  }

  const reset = () => setState({ status: 'idle', data: null, error: null, savedRow: null, rateLimit: null })
  return { ...state, analyze, reset }
}
