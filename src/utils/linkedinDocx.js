const ACCENT = 'E07856'
const TEXT_PRIMARY = '1A1B22'
const TEXT_SECONDARY = '5C6066'

export async function generateOptimizedLinkedInDocx(optimization, opts = {}) {
  const [{ Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle }, { saveAs }] = await Promise.all([
    import('docx'),
    import('file-saver')
  ])

  const heading = text => new Paragraph({
    spacing: { before: 240, after: 120 },
    border: { bottom: { color: ACCENT, space: 4, style: BorderStyle.SINGLE, size: 6 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: ACCENT, size: 22, font: 'Calibri' })]
  })
  const subHeading = text => new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text, bold: true, color: TEXT_PRIMARY, size: 22, font: 'Calibri' })]
  })
  const body = text => new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, color: TEXT_PRIMARY, size: 20, font: 'Calibri' })]
  })
  const bullet = text => new Paragraph({
    spacing: { after: 60 },
    bullet: { level: 0 },
    children: [new TextRun({ text, color: TEXT_PRIMARY, size: 20, font: 'Calibri' })]
  })

  const { fileName = 'LinkedIn-optimized.docx' } = opts
  const o = optimization || {}
  const children = []

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: 'Your Optimized LinkedIn Profile', bold: true, color: TEXT_PRIMARY, size: 32, font: 'Calibri' })]
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: `Overall score after improvements: ${Math.min(100, (o.overall_score || 0) + 25)}/100`, color: ACCENT, size: 18, italics: true, font: 'Calibri' })]
  }))

  if (o.headline?.improved_version) {
    children.push(heading('Headline (≤220 chars)'))
    children.push(body(o.headline.improved_version))
    if (o.headline.why_better) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: `Why this works: ${o.headline.why_better}`, color: TEXT_SECONDARY, italics: true, size: 18, font: 'Calibri' })]
      }))
    }
  }

  if (o.about?.improved_version) {
    children.push(heading('About / Summary'))
    o.about.improved_version.split(/\n\n+/).forEach(para => {
      const trimmed = para.trim()
      if (trimmed) children.push(body(trimmed))
    })
  }

  if (o.experience?.improvements?.length > 0) {
    children.push(heading('Experience — Improved Bullets'))
    o.experience.improvements.forEach(imp => {
      if (imp.role_title) children.push(subHeading(imp.role_title))
      if (Array.isArray(imp.improved_bullets)) {
        imp.improved_bullets.forEach(b => children.push(bullet(b)))
      }
    })
  }

  if (o.skills) {
    const hasContent = (o.skills.to_reorder_top_3?.length || 0) + (o.skills.to_add?.length || 0) + (o.skills.to_remove?.length || 0) > 0
    if (hasContent) {
      children.push(heading('Skills'))
      if (o.skills.to_reorder_top_3?.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Pin these as your top 3: ', bold: true, color: TEXT_PRIMARY, size: 20, font: 'Calibri' }),
            new TextRun({ text: o.skills.to_reorder_top_3.join(' · '), color: ACCENT, size: 20, font: 'Calibri', bold: true })
          ]
        }))
      }
      if (o.skills.to_add?.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Add: ', bold: true, color: TEXT_PRIMARY, size: 20, font: 'Calibri' }),
            new TextRun({ text: o.skills.to_add.join(', '), color: TEXT_PRIMARY, size: 20, font: 'Calibri' })
          ]
        }))
      }
      if (o.skills.to_remove?.length > 0) {
        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Remove: ', bold: true, color: TEXT_PRIMARY, size: 20, font: 'Calibri' }),
            new TextRun({ text: o.skills.to_remove.join(', '), color: TEXT_SECONDARY, size: 20, font: 'Calibri', strike: true })
          ]
        }))
      }
    }
  }

  if (o.quick_wins?.length > 0) {
    children.push(heading('Quick Wins'))
    o.quick_wins.forEach(qw => children.push(bullet(qw)))
  }

  children.push(new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 240, after: 100 } }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '— Optimized with Joblytics — Review and edit before publishing —', color: '999999', size: 14, italics: true, font: 'Calibri' })]
  }))

  const doc = new Document({
    creator: 'Joblytics',
    title: 'Optimized LinkedIn Profile',
    sections: [{ properties: { page: { margin: { top: 720, right: 900, bottom: 720, left: 900 } } }, children }]
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, fileName)
}
