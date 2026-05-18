import pdfParse from 'pdf-parse'

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function stripDataUrl(value) {
  return String(value || '').replace(/^data:application\/pdf;base64,/i, '').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { fileBase64, filename } = req.body || {}
    if (!fileBase64) return res.status(400).json({ error: 'Upload a LinkedIn profile PDF first.', code: 'PDF_REQUIRED' })

    const buffer = Buffer.from(stripDataUrl(fileBase64), 'base64')
    if (!buffer.length) return res.status(400).json({ error: 'The uploaded PDF is empty or unreadable.', code: 'EMPTY_PDF' })
    if (buffer.length > 7 * 1024 * 1024) return res.status(413).json({ error: 'PDF is too large. Please upload a file under 7 MB.', code: 'PDF_TOO_LARGE' })

    const parsed = await pdfParse(buffer)
    const text = clean(parsed.text)

    if (text.length < 120) {
      return res.status(422).json({
        error: 'The PDF was imported, but not enough readable LinkedIn profile text was found. Please export the profile PDF again from LinkedIn or paste the profile text manually.',
        code: 'PDF_TEXT_TOO_SHORT',
        filename: filename || null,
        text
      })
    }

    return res.status(200).json({
      success: true,
      filename: filename || null,
      characters: text.length,
      pages: parsed.numpages || null,
      text
    })
  } catch (e) {
    console.error('LinkedIn PDF import error:', e)
    return res.status(500).json({
      error: 'Could not import this LinkedIn PDF. Please try another exported PDF or paste the profile text manually.',
      code: 'PDF_IMPORT_FAILED'
    })
  }
}
