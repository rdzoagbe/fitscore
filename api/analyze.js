import { createClient } from "@supabase/supabase-js"
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are an expert recruiter and ATS specialist with 15 years of experience using Workday, Greenhouse, Lever, Taleo, and SAP SuccessFactors.

Analyze the CV against the job offer like a real ATS system would. Return ONLY a valid JSON object (no markdown, no backticks):

{
  "job_title": "<extracted job title, max 6 words>",
  "verdict": "<one honest sentence, max 12 words>",
  "keyword_match": {
    "score": <0-100>,
    "found": ["exact keywords from job offer found verbatim in CV, max 10"],
    "missing_required": ["critical required keywords completely absent from CV, max 6"],
    "missing_nice": ["nice-to-have keywords absent from CV, max 4"]
  },
  "requirements_check": {
    "score": <0-100>,
    "met": ["specific requirements from job offer the candidate meets, max 5"],
    "unmet": ["specific requirements from job offer the candidate does NOT meet, max 4"]
  },
  "format_warnings": ["<ATS formatting issue if any, max 3. Empty array if clean.>"],
  "critical_gaps": ["<things that would DEFINITELY get this CV auto-filtered. Max 3. Empty array if none.>"],
  "quick_wins": ["<specific 1-sentence fix. Max 4. Be concrete.>"],
  "overall_verdict": "<one of: 'likely_filtered' | 'borderline' | 'likely_passed'>",
  "overall_reason": "<one sentence explaining the overall verdict>"
}`

async function fetchJobText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    }
  })
  if (!res.ok) throw new Error(`Could not fetch job page (${res.status}). Try Indeed or Welcome to the Jungle instead.`)
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ').trim()
  if (text.length < 100) throw new Error('Could not extract text from this page. Try Indeed or Welcome to the Jungle instead.')
  return text.slice(0, 6000)
}

async function extractCvText(base64Data, mimeType) {
  const buffer = Buffer.from(base64Data, 'base64')
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer)
    return result.text
  }
  if (mimeType.includes('word') || mimeType.includes('officedocument')) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  throw new Error('Unsupported file type. Please upload a PDF or Word document.')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const { jobUrl, cvBase64, cvMimeType, userId, cvFileName, accessToken } = req.body
    if (!jobUrl || !cvBase64 || !cvMimeType) return res.status(400).json({ error: 'Missing required fields' })

    console.log('Request received. userId:', userId, 'hasToken:', !!accessToken, 'SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'MISSING', 'SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING')

    const [jobText, cvText] = await Promise.all([
      fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract text from your CV. Make sure it is not a scanned image.' })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB OFFER:\n${jobText}\n\n---\n\nCV:\n${cvText}` }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(raw)
    analysis.display_score = Math.round((analysis.keyword_match.score * 0.6) + (analysis.requirements_check.score * 0.4))
    analysis.job_url = jobUrl

    // Try to save — use service role key to bypass RLS
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Attempting save. userId:', userId, 'supabaseUrl set:', !!supabaseUrl, 'serviceKey set:', !!serviceKey)

    if (userId && supabaseUrl && serviceKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })

        // Verify user exists
        const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(userId)
        console.log('User lookup:', userData?.user?.email || 'NOT FOUND', userError?.message || 'no error')

        let cvStoragePath = null
        if (cvBase64 && cvFileName) {
          const buffer = Buffer.from(cvBase64, 'base64')
          const filePath = `${userId}/${Date.now()}_${cvFileName}`
          const { data: storageData, error: storageErr } = await adminSupabase.storage
            .from('cvs').upload(filePath, buffer, { contentType: cvMimeType, upsert: false })
          if (storageErr) console.log('Storage error:', storageErr.message)
          else cvStoragePath = storageData?.path
        }

        const { data: insertData, error: dbError } = await adminSupabase.from('analyses').insert({
          user_id: userId,
          job_url: jobUrl,
          job_title: analysis.job_title || null,
          score: analysis.display_score,
          result: analysis,
          cv_file_path: cvStoragePath,
          cv_file_name: cvFileName || null
        }).select()

        if (dbError) console.log('DB insert error:', dbError.message, dbError.code)
        else console.log('DB save SUCCESS. Row id:', insertData?.[0]?.id)
      } catch (dbErr) {
        console.log('DB exception:', dbErr.message)
      }
    } else {
      console.log('Skipping save - missing:', !userId ? 'userId' : !supabaseUrl ? 'SUPABASE_URL' : 'SERVICE_KEY')
    }

    return res.status(200).json({ success: true, analysis })
  } catch (e) {
    console.error('Handler error:', e.message)
    return res.status(500).json({ error: e.message || 'Analysis failed' })
  }
}
