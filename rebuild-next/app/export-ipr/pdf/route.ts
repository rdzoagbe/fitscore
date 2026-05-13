import { NextResponse } from 'next/server'
import { requireUserSession } from '@/lib/auth/profile-session'
import { assertUsageAllowed } from '@/lib/billing/guards'
import { buildIprEvidenceSummary } from '@/lib/ipr/evidence'
import { buildIprPdf } from '@/lib/ipr/export'
import { getApplications } from '@/lib/tracker/data'

export async function GET(): Promise<NextResponse> {
  const user = await requireUserSession()
  const usage = await assertUsageAllowed(user.id, 'iprExport')
  if (!usage.allowed) return NextResponse.json({ error: usage.message }, { status: 402 })

  const applications = await getApplications(user.id, 1000)
  const summary = buildIprEvidenceSummary(applications)
  const pdf = buildIprPdf(summary)
  const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="joblytics-ipr-evidence.pdf"',
      'Cache-Control': 'no-store'
    }
  })
}
