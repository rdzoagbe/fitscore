import { AtsAnalysisCard } from '@/components/ats/AtsAnalysisCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { getAtsHistory } from '@/lib/ats/history'
import { requireUserSession } from '@/lib/auth/profile-session'
import { createClient } from '@/lib/supabase/server'
import { ScannerForm } from './ScannerForm'

type CvOption = {
  id: string
  name: string
  file_name: string
  target_role: string | null
}

async function getCvVersions(userId: string): Promise<CvOption[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('cv_versions')
    .select('id,name,file_name,target_role')
    .eq('user_id', userId)
    .not('parsed_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []) as CvOption[]
}

export default async function ScannerPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const [cvVersions, history] = await Promise.all([getCvVersions(user.id), getAtsHistory(user.id, 5)])
  const latestScore = history[0]?.overallScore ?? history[0]?.result.overall_score ?? null

  return (
    <AppShell>
      <PageScaffold title="ATS Scanner" subtitle="Compare a job description against your parsed CV versions">
        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <Card>
            <CardHeader><CardTitle>Run ATS analysis</CardTitle></CardHeader>
            {cvVersions.length === 0 ? (
              <p className="rounded-md border border-amber/20 bg-amber/10 p-4 text-sm text-amber">Upload and parse a CV in CV Enhancer before running an ATS scan.</p>
            ) : <ScannerForm cvVersions={cvVersions} />}
          </Card>
          <Card>
            <CardHeader><CardTitle>Scan readiness</CardTitle></CardHeader>
            <div className="grid gap-3">
              <ProgressRow label="CV versions" value={cvVersions.length > 0 ? 100 : 0} tone={cvVersions.length > 0 ? 'emerald' : 'red'} />
              <ProgressRow label="Latest score" value={latestScore ?? 0} tone={(latestScore ?? 0) >= 70 ? 'emerald' : 'amber'} />
              <ProgressRow label="Saved scans" value={Math.min(history.length * 20, 100)} tone={history.length > 0 ? 'emerald' : 'amber'} />
              <ProgressRow label="AI fallback" value={100} tone="violet" />
            </div>
            <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">The scanner uses structured AI output when ANTHROPIC_API_KEY is available, and a deterministic ATS fallback when it is not.</p>
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Recent ATS scans</CardTitle></CardHeader>
          <div className="grid gap-3">
            {history.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No ATS scans saved yet. Run your first scan above.</p> : history.map(item => <AtsAnalysisCard key={item.id} item={item} compact />)}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
