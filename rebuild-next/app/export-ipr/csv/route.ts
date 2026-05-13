import { NextResponse } from 'next/server'
import { requireUserSession } from '@/lib/auth/profile-session'
import { buildIprEvidenceSummary } from '@/lib/ipr/evidence'
import { buildIprCsv } from '@/lib/ipr/export'
import { getApplications } from '@/lib/tracker/data'

export async function GET(): Promise<NextResponse> {
  const user = await requireUserSession()
  const applications = await getApplications(user.id, 1000)
  const summary = buildIprEvidenceSummary(applications)
  const csv = buildIprCsv(summary)
  const body = `\ufeff${csv}`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="joblytics-ipr-evidence.csv"',
      'Cache-Control': 'no-store'
    }
  })
}
