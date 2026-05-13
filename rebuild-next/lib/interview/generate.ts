import Anthropic from '@anthropic-ai/sdk'
import { interviewPrepRequestSchema, interviewPrepResultSchema, type InterviewPrepRequest, type InterviewPrepResult } from '@/lib/interview/schema'

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
  throw new Error('No JSON object found in AI response')
}

function fallbackInterviewPrep(request: InterviewPrepRequest): InterviewPrepResult {
  const isFrench = request.language === 'fr'
  const questions = isFrench ? [
    'Pouvez-vous me présenter votre parcours et votre adéquation avec ce poste ?',
    'Décrivez une situation où vous avez géré un incident critique.',
    'Comment priorisez-vous les demandes entre métiers, support et direction ?',
    'Comment mesurez-vous la qualité de service IT ?',
    'Pourquoi souhaitez-vous rejoindre cette entreprise ?'
  ] : [
    'Walk me through your background and fit for this role.',
    'Tell me about a time you managed a critical incident.',
    'How do you prioritize requests across business, support and leadership?',
    'How do you measure IT service quality?',
    'Why do you want to join this company?'
  ]

  return {
    role_pitch: isFrench
      ? `Je suis un profil IT orienté service, opérations et amélioration continue. Pour le poste de ${request.jobTitle} chez ${request.companyName}, je mettrais l'accent sur la fiabilité, la clarté des priorités, la qualité de service et la coordination entre équipes techniques et métiers.`
      : `I am an IT profile focused on service delivery, operations and continuous improvement. For the ${request.jobTitle} role at ${request.companyName}, I would emphasize reliability, prioritization, service quality and coordination between technical and business stakeholders.`,
    likely_questions: questions.map(question => ({
      question,
      why_they_ask: isFrench ? 'Le recruteur veut vérifier votre capacité à structurer votre réponse avec des exemples concrets.' : 'The interviewer wants to validate your ability to structure a clear answer with concrete examples.',
      strong_answer: isFrench ? 'Répondez avec un exemple précis, votre rôle exact, les actions menées, les indicateurs suivis et le résultat obtenu.' : 'Answer with a precise example, your exact role, the actions taken, the indicators monitored and the outcome achieved.',
      star_structure: {
        situation: isFrench ? 'Contexte opérationnel ou projet avec enjeu business clair.' : 'Operational or project context with a clear business impact.',
        task: isFrench ? 'Votre responsabilité directe et l’objectif à atteindre.' : 'Your direct responsibility and the goal to achieve.',
        action: isFrench ? 'Les décisions, coordinations et actions concrètes que vous avez menées.' : 'The decisions, coordination and concrete actions you led.',
        result: isFrench ? 'Résultat mesurable : SLA, délai, coût, qualité, satisfaction ou réduction du risque.' : 'Measurable result: SLA, timeline, cost, quality, satisfaction or risk reduction.'
      }
    })),
    technical_topics: ['ITIL', 'SLA/KPI', 'Microsoft 365', 'Azure', 'Incident management', 'Stakeholder management'],
    questions_to_ask: isFrench ? [
      'Quels sont les principaux enjeux IT sur les 6 prochains mois ?',
      'Comment mesurez-vous la réussite dans ce poste ?',
      'Quels outils et processus sont déjà en place ?'
    ] : [
      'What are the main IT priorities for the next six months?',
      'How do you measure success in this role?',
      'Which tools and processes are already in place?'
    ],
    salary_positioning: isFrench ? 'Positionnez votre rémunération sur la valeur apportée, la responsabilité du périmètre et le niveau d’autonomie attendu.' : 'Position compensation around delivered value, scope responsibility and expected autonomy.',
    risks_to_prepare: [
      { risk: isFrench ? 'Profil perçu comme trop large' : 'Profile perceived as too broad', response: isFrench ? 'Recentrez votre réponse sur les besoins exacts du poste.' : 'Refocus your answer on the exact needs of the role.' }
    ],
    confidence_score: 78,
    language: request.language
  }
}

function systemPrompt(language: 'fr' | 'en'): string {
  return language === 'fr'
    ? 'Tu es un coach entretien senior. Réponds uniquement en JSON valide conforme au schéma demandé. Ne crée pas de fausses expériences.'
    : 'You are a senior interview coach. Return only valid JSON matching the requested schema. Do not invent experience.'
}

function userPrompt(request: InterviewPrepRequest): string {
  return `Generate structured interview preparation for this role. Return JSON with: role_pitch, likely_questions, technical_topics, questions_to_ask, salary_positioning, risks_to_prepare, confidence_score, language.\n\nLanguage: ${request.language}\nSeniority: ${request.seniority}\nCompany: ${request.companyName}\nJob title: ${request.jobTitle}\n\nCV TEXT:\n${request.cvText.slice(0, 65000)}\n\nJOB DESCRIPTION:\n${request.jobDescription.slice(0, 35000)}`
}

export async function generateInterviewPrep(input: unknown): Promise<InterviewPrepResult> {
  const request = interviewPrepRequestSchema.parse(input)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) return fallbackInterviewPrep(request)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 4500,
      temperature: 0.3,
      system: systemPrompt(request.language),
      messages: [{ role: 'user', content: userPrompt(request) }]
    })

    const text = response.content.map(block => block.type === 'text' ? block.text : '').join('\n')
    return interviewPrepResultSchema.parse(extractJson(text))
  } catch (error) {
    console.error('Interview prep AI generation failed, using fallback', error)
    return fallbackInterviewPrep(request)
  }
}
