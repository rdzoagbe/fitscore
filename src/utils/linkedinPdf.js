const ACCENT = [224, 120, 86]
const TEXT_PRIMARY = [26, 27, 34]
const TEXT_SECONDARY = [92, 96, 102]

export async function generateOptimizedLinkedInPdf(optimization, opts = {}) {
  const { jsPDF } = await import('jspdf')

  const { fileName = 'LinkedIn-optimized.pdf' } = opts
  const o = optimization || {}

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 50
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = needed => {
    if (y + needed > pageHeight - margin) { doc.addPage(); y = margin }
  }

  const heading = text => {
    ensureSpace(40); y += 14
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...ACCENT)
    doc.text(text.toUpperCase(), margin, y); y += 4
    doc.setDrawColor(...ACCENT); doc.setLineWidth(1); doc.line(margin, y, pageWidth - margin, y); y += 12
  }

  const subHeading = text => {
    ensureSpace(30); y += 8
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TEXT_PRIMARY)
    doc.text(text, margin, y); y += 14
  }

  const body = (text, color = TEXT_PRIMARY, italic = false) => {
    if (!text) return
    doc.setFont('helvetica', italic ? 'italic' : 'normal'); doc.setFontSize(10); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, contentWidth)
    lines.forEach(line => { ensureSpace(14); doc.text(line, margin, y); y += 13 })
    y += 4
  }

  const bullet = text => {
    if (!text) return
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TEXT_PRIMARY)
    const lines = doc.splitTextToSize(text, contentWidth - 14)
    lines.forEach((line, i) => { ensureSpace(14); if (i === 0) doc.text('•', margin, y); doc.text(line, margin + 14, y); y += 13 })
    y += 3
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...TEXT_PRIMARY)
  doc.text('Your Optimized LinkedIn Profile', pageWidth / 2, y, { align: 'center' }); y += 22
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(...ACCENT)
  doc.text(`Score after improvements: ${Math.min(100, (o.overall_score || 0) + 25)}/100`, pageWidth / 2, y, { align: 'center' }); y += 18

  if (o.headline?.improved_version) {
    heading('Headline (≤220 chars)')
    body(o.headline.improved_version)
    if (o.headline.why_better) body(`Why this works: ${o.headline.why_better}`, TEXT_SECONDARY, true)
  }

  if (o.about?.improved_version) {
    heading('About / Summary')
    o.about.improved_version.split(/\n\n+/).forEach(para => { const t = para.trim(); if (t) body(t) })
  }

  if (o.experience?.improvements?.length > 0) {
    heading('Experience — Improved Bullets')
    o.experience.improvements.forEach(imp => {
      if (imp.role_title) subHeading(imp.role_title)
      if (Array.isArray(imp.improved_bullets)) imp.improved_bullets.forEach(b => bullet(b))
    })
  }

  if (o.skills) {
    const hasContent = (o.skills.to_reorder_top_3?.length || 0) + (o.skills.to_add?.length || 0) + (o.skills.to_remove?.length || 0) > 0
    if (hasContent) {
      heading('Skills')
      if (o.skills.to_reorder_top_3?.length > 0) body(`Pin these as your top 3: ${o.skills.to_reorder_top_3.join(' · ')}`)
      if (o.skills.to_add?.length > 0) body(`Add: ${o.skills.to_add.join(', ')}`)
      if (o.skills.to_remove?.length > 0) body(`Remove: ${o.skills.to_remove.join(', ')}`, TEXT_SECONDARY, true)
    }
  }

  if (o.quick_wins?.length > 0) { heading('Quick Wins'); o.quick_wins.forEach(qw => bullet(qw)) }

  y += 20; ensureSpace(20)
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150, 150, 150)
  doc.text('— Optimized with Joblytics — Review and edit before publishing —', pageWidth / 2, y, { align: 'center' })

  doc.save(fileName)
}
