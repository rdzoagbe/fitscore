import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Fetches the previous score for the same job URL (or job title if no URL)
// Returns null if there's no previous analysis to compare against
export function useScoreDelta(currentAnalysis) {
  const { user } = useAuth()
  const [delta, setDelta] = useState(null)

  useEffect(() => {
    if (!user || !currentAnalysis) { setDelta(null); return }
    const jobUrl = currentAnalysis.job_url
    const jobTitle = currentAnalysis.job_context?.title || currentAnalysis.job_title
    const currentScore = currentAnalysis.display_score
    if (!currentScore) { setDelta(null); return }
    if (!jobUrl && !jobTitle) { setDelta(null); return }

    ;(async () => {
      try {
        // Find the most recent OTHER analysis for the same job
        let query = supabase
          .from('analyses')
          .select('id, score, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (jobUrl) query = query.eq('job_url', jobUrl)
        else if (jobTitle) query = query.eq('job_title', jobTitle)

        const { data, error } = await query
        if (error || !data || data.length === 0) { setDelta(null); return }

        // Find the previous one (not the current — by ID if available, or by skipping the most recent matching score)
        const currentId = currentAnalysis.id
        const previous = data.find(a => a.id !== currentId)
        if (!previous) { setDelta(null); return }

        const d = currentScore - previous.score
        // Only show if there's an actual difference
        if (d === 0) { setDelta(null); return }
        setDelta(d)
      } catch (e) {
        console.error('Score delta error:', e.message)
        setDelta(null)
      }
    })()
  }, [user, currentAnalysis?.job_url, currentAnalysis?.id, currentAnalysis?.display_score])

  return delta
}
