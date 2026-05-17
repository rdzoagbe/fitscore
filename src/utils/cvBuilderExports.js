import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'

const ACCENT = 'B5663C'
const NAVY = '10182B'
const MUTED = '5F6472'

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const fileSafe = value => clean(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'adapted-cv'
const asList = values => Array.isArray(values) ? values.map(clean).filter(Boolean) : []

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    border: { bottom: { color: ACCENT, space: 3, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: ACCENT, size: 22, font: 'Calibri' })]
  })
}

function body(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: clean(text), color: NAVY, size: 20, font: 'Calibri' })]
  })
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 70 },
    children: [new TextRun({ text: clean(text), color: NAVY, size: 20, font: 'Calibri' })]
  })
}

export function makeCvBuilderExportModel(preview) {
  const p = preview || {}
  const sections = p.sections || {}
  const keywords = asList(sections.skills).length ? asList(sections.skills) : clean(p.keywords?.after).split(',').map(clean).filter(Boolean)
  const requirements = asList(sections.requirements).length ? asList(sections.requirements) : clean(p.requirements?.after).split(';').map(clean).filter(Boolean)
  const bullets = asList(sections.bullets).length ? asList(sections.bullets) : [clean(p.achievements?.after)].filter(Boolean)
  const gaps = asList(sections.gaps)

  return {
    title: clean(p.header?.after || sections.headline || 'Job-aligned CV draft'),
    source: clean(p.header?.before || 'Current CV'),
    target: p.target || {},
    headline: clean(sections.headline || p.header?.after || 'Job-aligned candidate profile'),
    profile: clean(sections.profile || p.summary?.after || 'Adapt the current CV profile to the target role using only real, provable experience.'),
    keywords,
    requirements,
    bullets,
    gaps,
    disclaimer: 'Adapted by Joblytics from the user CV signals and ATS gaps. Review carefully before sending. Do not keep any claim you cannot evidence.',
    changes: [
      ['CV positioning', p.header?.before, p.header?.after],
      ['Professional summary', p.summary?.before, p.summary?.after],
      ['Missing keywords to add', p.keywords?.before, p.keywords?.after],
      ['Requirements to evidence', p.requirements?.before, p.requirements?.after],
      ['Experience bullet updates', p.achievements?.before, p.achievements?.after]
    ].filter(row => row[1] || row[2])
  }
}

export async function downloadCvBuilderDocx(preview, opts = {}) {
  const model = makeCvBuilderExportModel(preview)
  const fileName = opts.fileName || `Joblytics-Adapted-CV-${fileSafe(model.title)}.docx`

  const children = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: model.title, bold: true, color: NAVY, size: 36, font: 'Calibri' })]
    }),
    new Paragraph({
      spacing: { after: 220 },
      children: [new TextRun({ text: `Based on: ${model.source}`, color: MUTED, size: 18, font: 'Calibri' })]
    }),
    heading('Target positioning'),
    body(model.headline),
    heading('Professional profile'),
    body(model.profile),
    heading('Core skills to include')
  ]

  model.keywords.slice(0, 16).forEach(item => children.push(bullet(item)))

  children.push(heading('Requirements to make visible'))
  if (model.requirements.length) {
    model.requirements.slice(0, 8).forEach(item => children.push(bullet(item)))
  } else {
    children.push(body('No major unmet requirements were detected. Keep the existing CV evidence clear and measurable.'))
  }

  children.push(heading('Experience bullets to update'))
  model.bullets.slice(0, 8).forEach(item => children.push(bullet(item)))

  if (model.gaps.length) {
    children.push(heading('Gaps to handle carefully'))
    model.gaps.slice(0, 5).forEach(item => children.push(bullet(item)))
  }

  children.push(heading('Change log'))
  model.changes.forEach(([title, before, after]) => {
    children.push(new Paragraph({ spacing: { before: 120, after: 50 }, children: [new TextRun({ text: title, bold: true, color: NAVY, size: 22, font: 'Calibri' })] }))
    if (before) children.push(body(`Current CV signal: ${before}`))
    if (after) children.push(body(`Job-aligned update: ${after}`))
  })

  children.push(new Paragraph({ spacing: { before: 260 }, children: [new TextRun({ text: model.disclaimer, color: MUTED, size: 16, italics: true, font: 'Calibri' })] }))

  const doc = new Document({
    creator: 'Joblytics',
    title: 'Joblytics Adapted CV Draft',
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{ properties: { page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } } }, children }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)
}

export function downloadCvBuilderPdf(preview, opts = {}) {
  const model = makeCvBuilderExportModel(preview)
  const fileName = opts.fileName || `Joblytics-Adapted-CV-${fileSafe(model.title)}.pdf`
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const margin = 48
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  let y = 54

  const addText = (text, size = 10, color = [16, 24, 43], gap = 14, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    const lines = pdf.splitTextToSize(clean(text), width)
    lines.forEach(line => {
      if (y > 770) { pdf.addPage(); y = 54 }
      pdf.text(line, margin, y)
      y += gap
    })
  }

  const addSection = title => {
    y += 12
    addText(title.toUpperCase(), 10, [181, 102, 60], 14, true)
    pdf.setDrawColor(181, 102, 60)
    pdf.line(margin, y - 6, margin + width, y - 6)
    y += 8
  }

  const addBullets = values => {
    values.forEach(item => addText(`• ${item}`, 10, [16, 24, 43], 14))
  }

  addText(model.title, 22, [16, 24, 43], 25, true)
  addText(`Based on: ${model.source}`, 10, [95, 100, 114], 14)
  addSection('Target positioning')
  addText(model.headline, 10, [16, 24, 43], 14)
  addSection('Professional profile')
  addText(model.profile, 10, [16, 24, 43], 14)
  addSection('Core skills to include')
  addBullets(model.keywords.slice(0, 16))
  addSection('Requirements to make visible')
  if (model.requirements.length) addBullets(model.requirements.slice(0, 8))
  else addText('No major unmet requirements were detected. Keep the existing CV evidence clear and measurable.', 10, [16, 24, 43], 14)
  addSection('Experience bullets to update')
  addBullets(model.bullets.slice(0, 8))
  if (model.gaps.length) {
    addSection('Gaps to handle carefully')
    addBullets(model.gaps.slice(0, 5))
  }
  addSection('Change log')
  model.changes.forEach(([title, before, after]) => {
    addText(title, 11, [16, 24, 43], 15, true)
    if (before) addText(`Current CV signal: ${before}`, 9, [95, 100, 114], 13)
    if (after) addText(`Job-aligned update: ${after}`, 9, [16, 24, 43], 13)
    y += 6
  })
  addText(model.disclaimer, 8, [95, 100, 114], 11)
  pdf.save(fileName)
}
