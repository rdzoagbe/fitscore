import Anthropic from '@anthropic-ai/sdk'
import { coverLetterRequestSchema, coverLetterResultSchema, type CoverLetterRequest, type CoverLetterResult } from '@/lib/cover-letter/schema'

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
  throw new Error('No JSON object found in AI response')
}

function fallbackCoverLetter(request: CoverLetterRequest): CoverLetterResult {
  const isFrench = request.language === 'fr'
  const subject = isFrench
    ? `Objet : Candidature au poste de ${request.jobTitle}`
    : `Subject: Application for ${request.jobTitle}`
  const greeting = isFrench ? 'Madame, Monsieur,' : 'Dear Hiring Team,'
  const body = isFrench
    ? `Je vous adresse ma candidature pour le poste de ${request.jobTitle} au sein de ${request.companyName}. Votre besoin correspond à mon expérience en pilotage IT, amélioration des services, coordination opérationnelle et accompagnement des équipes.\n\nMon parcours m’a permis de gérer des environnements exigeants, d’améliorer la qualité de service, de structurer les processus et de travailler avec des interlocuteurs techniques comme métiers. Je souhaite mettre cette expérience au service de ${request.companyName}, avec une approche orientée résultats, fiabilité et amélioration continue.\n\nJe serais ravi d’échanger avec vous afin de vous présenter plus en détail la valeur que je peux apporter à ce poste.`
    : `I am applying for the ${request.jobTitle} position at ${request.companyName}. The role aligns strongly with my experience in IT leadership, service improvement, operational coordination and stakeholder support.\n\nMy background has allowed me to manage demanding environments, improve service quality, structure processes and work closely with both technical and business teams. I would be pleased to bring this experience to ${request.companyName}, with a practical focus on reliability, measurable results and continuous improvement.\n\nI would welcome the opportunity to discuss how my background can support your team’s objectives.`

  return {
    subject,
    greeting,
    body,
    closing: isFrench ? 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.' : 'Kind regards,',
    signature: 'Roland Dzoagbe',
    bullets_used: [],
    language: request.language
  }
}

function systemPrompt(language: 'fr' | 'en'): string {
  return language === 'fr'
    ? 'Tu es un expert en recrutement et rédaction de lettres de motivation. Réponds uniquement en JSON valide. Ne crée pas de fausses expériences.'
    : 'You are a recruiting and cover letter writing expert. Return only valid JSON. Do not invent experience.'
}

function userPrompt(request: CoverLetterRequest): string {
  return `Generate a tailored cover letter. Return JSON with: subject, greeting, body, closing, signature, bullets_used, language. Keep it concise, credible, role-specific and non-generic.\n\nTone: ${request.tone}\nLanguage: ${request.language}\nCompany: ${request.companyName}\nJob title: ${request.jobTitle}\n\nCV TEXT:\n${request.cvText.slice(0, 65000)}\n\nJOB DESCRIPTION:\n${request.jobDescription.slice(0, 35000)}`
}

export async function generateCoverLetter(input: unknown): Promise<CoverLetterResult> {
  const request = coverLetterRequestSchema.parse(input)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) return fallbackCoverLetter(request)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 2500,
      temperature: 0.35,
      system: systemPrompt(request.language),
      messages: [{ role: 'user', content: userPrompt(request) }]
    })

    const text = response.content.map(block => block.type === 'text' ? block.text : '').join('\n')
    return coverLetterResultSchema.parse(extractJson(text))
  } catch (error) {
    console.error('Cover letter AI generation failed, using fallback', error)
    return fallbackCoverLetter(request)
  }
}
