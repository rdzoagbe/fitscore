import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'

export default function ScannerPage(): JSX.Element {
  return (
    <PageScaffold title="ATS Scanner" subtitle="Compare a job description against your active CV">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader><CardTitle>Job description</CardTitle></CardHeader>
          <textarea className="min-h-80 w-full rounded-md border border-border bg-elevated p-4 text-sm text-[var(--text-secondary)] outline-none" placeholder="Paste a job description here..." />
          <div className="mt-4 flex justify-end"><Button variant="primary">Run ATS scan</Button></div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scan readiness</CardTitle></CardHeader>
          <div className="grid gap-3">
            <ProgressRow label="Keywords" value={88} tone="emerald" />
            <ProgressRow label="Experience" value={80} />
            <ProgressRow label="Skills" value={72} tone="violet" />
            <ProgressRow label="Format" value={58} tone="amber" />
          </div>
        </Card>
      </section>
    </PageScaffold>
  )
}
