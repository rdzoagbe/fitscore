import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Lazy supabase init — won't crash if env vars missing
function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !url.startsWith('http')) return null
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

const SYSTEM = `You are an expert ATS (Applicant Tracking System) analyzer and career coach.
Analyze the CV against the job offer and return ONLY a valid JSON object (no markdown, no backticks, no text outside JSON):
{
  "score": <integer 0-100>,
  "job_title": "<extract job title from the offer, max 6 words>",
  "verdict": "<one punchy sentence verdict, max 12 words>",
  "categories": { "keywords": <0-100>, "skills": <0-100>, "experience": <0-100>, "education": <0-100> },
  "found_keywords": ["keyword1", ...],
  "missing_keywords": ["keyword1", ...],
  "advice": [
    {"type": "add", "text": "..."},
    {"type": "reword", "text": "..."},
    {"type": "remove", "text": "..."}
  ]
}
Rules: found_keywords max 10, missing_keywords max 8, advice exactly 5 items, type: "add"|"reword"|"remove", Score 80+ = strong ATS match.`

async function fetchJobText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    }
  })
  if (!res.ok) throw new Error(`Could not fetch job page (${res.status}). Try a different job board URL.`)
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
    const { jobUrl, cvBase64, cvMimeType, userId, cvFileName } = req.body
    if (!jobUrl || !cvBase64 || !cvMimeType) return res.status(400).json({ error: 'Missing required fields' })

    const [jobText, cvText] = await Promise.all([
      fetchJobText(jobUrl),
      extractCvText(cvBase64, cvMimeType)
    ])

    if (!cvText || cvText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract text from your CV. Make sure it is not a scanned image.' })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: 'user', content: `JOB OFFER:\n${jobText}\n\n---\n\nCV:\n${cvText}` }]
    })

    const raw = message.content.map(b => b.text || '').join('').trim().replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(raw)

    // Save to Supabase if available and user is logged in
    try {
      const supabase = getSupabase()
      if (supabase && userId) {
        let cvStoragePath = null
        if (cvBase64 && cvFileName) {
          const buffer = Buffer.from(cvBase64, 'base64')
          const filePath = `${userId}/${Date.now()}_${cvFileName}`
          const { data: storageData } = await supabase.storage
            .from('cvs').upload(filePath, buffer, { contentType: cvMimeType, upsert: false })
          if (storageData) cvStoragePath = storageData.path
        }
        await supabase.from('analyses').insert({
          user_id: userId,
          job_url: jobUrl,
          job_title: analysis.job_title || null,
          score: analysis.score,
          result: analysis,
          cv_file_path: cvStoragePath,
          cv_file_name: cvFileName || null
        })
      }
    } catch (dbErr) {
      console.error('DB save failed (non-fatal):', dbErr.message)
    }

    return res.status(200).json({ success: true, analysis })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message || 'Analysis failed' })
  }
}
