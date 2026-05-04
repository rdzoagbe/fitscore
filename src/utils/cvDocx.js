import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

const ACCENT = 'E07856'
const TEXT_PRIMARY = '1A1B22'
const TEXT_SECONDARY = '5C6066'

const heading = (text) => new Paragraph({
  spacing: { before: 240, after: 120 },
  border: { bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 6 } },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, color: ACCENT, size: 22, font: 'Calibri' })]
})

const subHeading = (text) => new Paragraph({
  spacing: { before: 120, after: 60 },
  children: [new TextRun({ text, bold: true, color: TEXT_PRIMARY, size: 22, font: 'Calibri' })]
})

const body = (text) => new Paragraph({
  spacing: { after: 80 },
  children: [new TextRun({ text, color: TEXT_PRIMARY, size: 20, font: 'Calibri' })]
})

const bullet = (text) => new Paragraph({
  spacing: { after: 60 },
  bullet: { level: 0 },
  children: [new TextRun({ text, color: TEXT_PRIMARY, size: 20, font: 'Calibri' })]
})

const lineBreak = () => new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 100 } })

export async function generateOptimizedCvDocx(optimized, opts = {}) {
  const { fileName = 'CV-optimized.docx' } = opts
  const o = optimized || {}
  const h = o.header || {}
  const contact = h.contact || {}

  const children = []

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: h.full_name || 'Your Name', bold: true, color: TEXT_PRIMARY, size: 40, font: 'Calibri' })]
  }))

  if (h.title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: h.title, color: ACCENT, size: 24, font: 'Calibri' })]
    }))
  }

  const contactParts = []
  if (contact.email) contactParts.push(contact.email)
  if (contact.phone) contactParts.push(contact.phone)
  if (contact.location) contactParts.push(contact.location)
  if (contact.linkedin) contactParts.push(contact.linkedin)

  if (contactParts.length > 0) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: contactParts.join('  •  '), color: TEXT_SECONDARY, size: 18, font: 'Calibri' })]
    }))
  }

  if (o.summary) {
    children.push(heading('Profile'))
    children.push(body(o.summary))
  }

  if (Array.isArray(o.experience) && o.experience.length > 0) {
    children.push(heading('Experience'))
    o.experience.forEach((exp, i) => {
      const titleLine = []
      if (exp.title) titleLine.push(exp.title)
      if (exp.company) titleLine.push(`@ ${exp.company}`)
      if (titleLine.length > 0) children.push(subHeading(titleLine.join(' ')))

      const meta = []
      if (exp.dates) meta.push(exp.dates)
      if (exp.location) meta.push(exp.location)
      if (meta.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: meta.join(' · '), color: TEXT_SECONDARY, italics: true, size: 18, font: 'Calibri' })]
        }))
      }

      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach(b => children.push(bullet(b)))
      }
      if (i < o.experience.length - 1) children.push(lineBreak())
    })
  }

  const skills = o.skills || {}
  const hasSkills = (skills.technical?.length || 0) + (skills.soft?.length || 0) + (skills.languages?.length || 0) > 0

  if (hasSkills) {
    children.push(heading('Skills'))

    if (skills.technical?.length) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Technical: ', bold: true, color: TEXT_PRIMARY, size: 20, font: 'Calibri' }),
          new TextRun({ text: skills.technical.join(' · '), color: TEXT_PRIMARY, size: 20, font: 'Calibri' })
        ]
      }))
    }

    if (skills.soft?.length) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Soft: ', bold: true, color: TEXT_PRIMARY, size: 20, font: 'Calibri' }),
          new TextRun({ text: skills.soft.join(' · '), color: TEXT_PRIMARY, size: 20, font: 'Calibri' })
        ]
      }))
    }

    if (skills.languages?.length) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Languages: ', bold: true, color: TEXT_PRIMARY, size: 20, font: 'Calibri' }),
          new TextRun({ text: skills.languages.join(' · '), color: TEXT_PRIMARY, size: 20, font: 'Calibri' })
        ]
      }))
    }
  }

  if (Array.isArray(o.education) && o.education.length > 0) {
    children.push(heading('Education'))
    o.education.forEach(edu => {
      if (edu.degree) children.push(subHeading(edu.degree))
      const eduMeta = []
      if (edu.institution) eduMeta.push(edu.institution)
      if (edu.location) eduMeta.push(edu.location)
      if (edu.dates) eduMeta.push(edu.dates)
      if (eduMeta.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: eduMeta.join(' · '), color: TEXT_SECONDARY, italics: true, size: 18, font: 'Calibri' })]
        }))
      }
    })
  }

  children.push(lineBreak())
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '— Optimized with Joblytics — Review carefully before sending —', color: '999999', size: 14, italics: true, font: 'Calibri' })]
  }))

  const doc = new Document({
    creator: 'Joblytics',
    title: 'Optimized CV',
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } } },
      children
    }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)
}
