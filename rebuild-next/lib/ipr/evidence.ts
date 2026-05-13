import type { ApplicationItem } from '@/lib/tracker/data'

export type IprEvidenceCategory = 'positive' | 'negative' | 'no_response' | 'pending' | 'offer'

export type IprEvidenceItem = ApplicationItem & {
  readonly evidenceCategory: IprEvidenceCategory
  readonly evidenceLabel: string
  readonly evidenceNote: string
}

export type IprEvidenceSummary = {
  readonly total: number
  readonly positive: number
  readonly negative: number
  readonly noResponse: number
  readonly pending: number
  readonly offers: number
  readonly firstDate: string | null
  readonly lastDate: string | null
  readonly daysTracked: number
  readonly averagePerWeek: number
  readonly dossierStatus: 'ready' | 'needs_more_evidence' | 'empty'
  readonly items: IprEvidenceItem[]
}

function itemDate(item: ApplicationItem): string {
  return item.appliedAt ?? item.createdAt
}

function daysBetween(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(diff / 86400000) + 1)
}

export function classifyIprEvidence(item: ApplicationItem): Pick<IprEvidenceItem, 'evidenceCategory' | 'evidenceLabel' | 'evidenceNote'> {
  if (item.status === 'offer' || item.status === 'accepted') {
    return {
      evidenceCategory: 'offer',
      evidenceLabel: 'Offre / proposition',
      evidenceNote: 'Candidature ayant généré une proposition ou une étape finale.'
    }
  }

  if (['screening', 'interview_1', 'interview_2', 'technical_test'].includes(item.status)) {
    return {
      evidenceCategory: 'positive',
      evidenceLabel: 'Réponse positive / entretien',
      evidenceNote: 'Candidature ayant généré un échange, un entretien ou un test.'
    }
  }

  if (item.status === 'rejected') {
    return {
      evidenceCategory: 'negative',
      evidenceLabel: 'Réponse négative',
      evidenceNote: 'Refus reçu après candidature.'
    }
  }

  if (item.status === 'no_response') {
    return {
      evidenceCategory: 'no_response',
      evidenceLabel: 'Sans réponse',
      evidenceNote: 'Candidature envoyée sans retour employeur à ce jour.'
    }
  }

  return {
    evidenceCategory: 'pending',
    evidenceLabel: item.status === 'applied' ? 'Candidature envoyée' : 'À suivre',
    evidenceNote: item.status === 'applied' ? 'Candidature envoyée, retour en attente.' : 'Opportunité suivie dans le pipeline.'
  }
}

export function buildIprEvidenceSummary(applications: ApplicationItem[]): IprEvidenceSummary {
  const items = applications
    .map(item => ({ ...item, ...classifyIprEvidence(item) }))
    .sort((a, b) => new Date(itemDate(b)).getTime() - new Date(itemDate(a)).getTime())

  const total = items.length
  const dates = items.map(itemDate).filter(Boolean).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const firstDate = dates[0] ?? null
  const lastDate = dates[dates.length - 1] ?? null
  const daysTracked = firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0
  const averagePerWeek = daysTracked > 0 ? Math.round((total / (daysTracked / 7)) * 10) / 10 : 0

  const positive = items.filter(item => item.evidenceCategory === 'positive').length
  const negative = items.filter(item => item.evidenceCategory === 'negative').length
  const noResponse = items.filter(item => item.evidenceCategory === 'no_response').length
  const pending = items.filter(item => item.evidenceCategory === 'pending').length
  const offers = items.filter(item => item.evidenceCategory === 'offer').length

  const dossierStatus = total === 0 ? 'empty' : total >= 5 || positive + negative + noResponse >= 3 ? 'ready' : 'needs_more_evidence'

  return {
    total,
    positive,
    negative,
    noResponse,
    pending,
    offers,
    firstDate,
    lastDate,
    daysTracked,
    averagePerWeek,
    dossierStatus,
    items
  }
}

export function dossierStatusLabel(status: IprEvidenceSummary['dossierStatus']): string {
  if (status === 'ready') return 'Ready'
  if (status === 'needs_more_evidence') return 'Needs evidence'
  return 'Empty'
}
