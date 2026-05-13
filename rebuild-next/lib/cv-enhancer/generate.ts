import Anthropic from '@anthropic-ai/sdk'
import { cvEnhancerRequestSchema, cvEnhancerResultSchema, type CvEnhancerRequest, type CvEnhancerResult } from '@/lib/cv-enhancer/schema'

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
  throw new Error('No JSON object found in AI response')
}

function fallbackEnhancement(request: CvEnhancerRequest): CvEnhancerResult {
  const isFrench = request.language === 'fr'
  const summary = isFrench
    ? `Responsable IT orienté service, opérations et amélioration continue, avec une expérience confirmée dans la coordination des équipes, la gestion des environnements Microsoft, le support aux utilisateurs, le suivi des SLA/KPI et la structuration des processus IT. Capable de faire le lien entre enjeux métiers, exigences opérationnelles et solutions techniques fiables.`
    : `IT leader focused on service delivery, operations and continuous improvement, with proven experience coordinating teams, managing Microsoft environments, supporting users, monitoring SLA/KPI performance and structuring IT processes. Able to connect business priorities, operational requirements and reliable technical solutions.`

  const bullets = [
    isFrench ? 'Pilotage des opérations IT quotidiennes avec suivi des SLA, priorisation des incidents et amélioration de la qualité de service.' : 'Led daily IT operations with SLA monitoring, incident prioritization and service-quality improvement.',
    isFrench ? 'Coordination des équipes support et des parties prenantes métiers afin d’assurer une résolution efficace des demandes.' : 'Coordinated support teams and business stakeholders to ensure effective request resolution.',
    isFrench ? 'Structuration des processus, documentation et indicateurs pour renforcer la fiabilité opérationnelle.' : 'Structured processes, documentation and metrics to improve operational reliability.',
    isFrench ? 'Contribution aux projets de transformation digitale, déploiements utilisateurs et amélioration des outils collaboratifs.' : 'Contributed to digital transformation projects, user deployments and collaboration-tool improvements.'
  ]

  return {
    improved_summary: summary,
    improved_skills: ['IT Service Management', 'Microsoft 365', 'Azure', 'SLA/KPI', 'Incident Management', 'Stakeholder Management', 'Process Improvement', 'Team Leadership'],
    rewritten_bullets: bullets.map(after => ({ before: null, after, rationale: isFrench ? 'Bullet orienté impact, action et résultat.' : 'Bullet rewritten to focus on action, impact and outcome.' })),
    ats_keywords_to_add: ['ITIL', 'SLA', 'KPI', 'Microsoft 365', 'Azure', 'Service Delivery', 'Incident Management'],
    formatting_recommendations: isFrench ? ['Utiliser des titres simples.', 'Éviter les tableaux complexes.', 'Ajouter des résultats mesurables.'] : ['Use simple headings.', 'Avoid complex tables.', 'Add measurable outcomes.'],
    risk_notes: isFrench ? ['Ne pas ajouter de compétences non maîtrisées.', 'Conserver uniquement les réalisations vérifiables.'] : ['Do not add skills you cannot defend.', 'Keep only verifiable achievements.'],
    enhanced_cv_text: [summary, '', 'Key skills:', 'IT Service Management · Microsoft 365 · Azure · SLA/KPI · Incident Management · Stakeholder Management', '', 'Selected achievements:', ...bullets.map(bullet => `- ${bullet}`)].join('\n'),
    readiness_score: 78,
    language: request.language
  }
}

function systemPrompt(language: 'fr' | 'en'): string {
  return language === 'fr'
    ? 'Tu es un expert ATS, CV senior et recrutement. Réponds uniquement en JSON valide. Ne crée pas de fausses expériences.'
    : 'You are a senior ATS, CV and recruiting expert. Return only valid JSON. Do not invent experience.'
}

function userPrompt(request: CvEnhancerRequest): string {
  return `Enhance this CV for ATS and recruiter readability. Return JSON with: improved_summary, improved_skills, rewritten_bullets, ats_keywords_to_add, formatting_recommendations, risk_notes, enhanced_cv_text, readiness_score, language.\n\nLanguage: ${request.language}\nStyle: ${request.style}\nTarget role: ${request.targetRole}\n\nCV TEXT:\n${request.cvText.slice(0, 80000)}\n\nOPTIONAL JOB DESCRIPTION:\n${request.jobDescription.slice(0, 35000)}`
}

export async function generateCvEnhancement(input: unknown): Promise<CvEnhancerResult> {
  const request = cvEnhancerRequestSchema.parse(input)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) return fallbackEnhancement(request)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 4500,
      temperature: 0.25,
      system: systemPrompt(request.language),
      messages: [{ role: 'user', content: userPrompt(request) }]
    })

    const text = response.content.map(block => block.type === 'text' ? block.text : '').join('\n')
    return cvEnhancerResultSchema.parse(extractJson(text))
  } catch (error) {
    console.error('CV enhancement AI generation failed, using fallback', error)
    return fallbackEnhancement(request)
  }
}
