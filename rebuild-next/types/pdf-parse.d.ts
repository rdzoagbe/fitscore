declare module 'pdf-parse' {
  interface PdfParseResult {
    readonly numpages: number
    readonly numrender: number
    readonly info: Record<string, unknown>
    readonly metadata: unknown
    readonly text: string
    readonly version: string
  }

  interface PdfParseOptions {
    readonly pagerender?: unknown
    readonly max?: number
    readonly version?: string
  }

  function pdfParse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>

  export default pdfParse
}
