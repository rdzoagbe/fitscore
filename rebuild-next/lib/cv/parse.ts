import mammoth from 'mammoth'
import pdf from 'pdf-parse'

const MAX_TEXT_LENGTH = 120_000

function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH)
}

export async function parseCvFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const name = file.name.toLowerCase()
  const type = file.type

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const parsed = await pdf(buffer)
    return normalizeText(parsed.text)
  }

  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
    const parsed = await mammoth.extractRawText({ buffer })
    return normalizeText(parsed.value)
  }

  if (type === 'text/plain' || name.endsWith('.txt')) {
    return normalizeText(buffer.toString('utf-8'))
  }

  throw new Error('Unsupported file type. Upload a PDF, DOCX or TXT file.')
}

export function isAllowedCvFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt')
}
