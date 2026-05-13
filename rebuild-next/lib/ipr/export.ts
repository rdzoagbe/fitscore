import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { IprEvidenceSummary } from '@/lib/ipr/evidence'

type ExportRow = {
  readonly date: string
  readonly company: string
  readonly role: string
  readonly evidence: string
  readonly platform: string
  readonly note: string
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(value))
}

function csvEscape(value: string | number): string {
  const text = String(value ?? '')
  if (/[";\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function rowsFromSummary(summary: IprEvidenceSummary): ExportRow[] {
  return summary.items.map(item => ({
    date: formatDate(item.appliedAt ?? item.createdAt),
    company: item.companyName,
    role: item.jobTitle,
    evidence: item.evidenceLabel,
    platform: item.platform ?? '',
    note: item.evidenceNote
  }))
}

export function buildIprCsv(summary: IprEvidenceSummary): string {
  const lines = [
    ['Résumé IPR - France Travail'],
    ['Total candidatures', summary.total],
    ['Jours suivis', summary.daysTracked],
    ['Moyenne par semaine', summary.averagePerWeek],
    ['Réponses positives / entretiens', summary.positive],
    ['Offres', summary.offers],
    ['Réponses négatives', summary.negative],
    ['Sans réponse', summary.noResponse],
    ['En attente', summary.pending],
    [],
    ['Date', 'Entreprise', 'Poste', 'Preuve', 'Plateforme', 'Note'],
    ...rowsFromSummary(summary).map(row => [row.date, row.company, row.role, row.evidence, row.platform, row.note])
  ]

  return lines.map(line => line.map(cell => csvEscape(cell ?? '')).join(';')).join('\n')
}

export function buildIprPdf(summary: IprEvidenceSummary): Uint8Array {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const margin = 36

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Preuves de recherche d’emploi — IPR France Travail', margin, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Généré le ${formatDate(new Date().toISOString())}`, margin, 62)

  autoTable(doc, {
    startY: 82,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    body: [
      ['Total candidatures', String(summary.total), 'Jours suivis', String(summary.daysTracked)],
      ['Moyenne / semaine', String(summary.averagePerWeek), 'Statut dossier', summary.dossierStatus],
      ['Entretiens / réponses positives', String(summary.positive), 'Offres', String(summary.offers)],
      ['Réponses négatives', String(summary.negative), 'Sans réponse', String(summary.noResponse)]
    ],
    margin: { left: margin, right: margin }
  })

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18 : 180,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    head: [['Date', 'Entreprise', 'Poste', 'Preuve', 'Plateforme', 'Note']],
    body: rowsFromSummary(summary).map(row => [row.date, row.company, row.role, row.evidence, row.platform, row.note]),
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 120 },
      2: { cellWidth: 150 },
      3: { cellWidth: 110 },
      4: { cellWidth: 80 },
      5: { cellWidth: 260 }
    },
    margin: { left: margin, right: margin }
  })

  return new Uint8Array(doc.output('arraybuffer'))
}
