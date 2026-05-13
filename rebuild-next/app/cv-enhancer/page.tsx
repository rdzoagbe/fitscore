import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export default function CvEnhancerPage(): JSX.Element {
  return (
    <AppShell>
      <PageScaffold title="CV Enhancer" subtitle="Improve readability, ATS compatibility and achievement impact">
        <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle>Overall CV score</CardTitle></CardHeader>
            <div className="grid gap-3">
              <ProgressRow label="Readability" value={88} tone="emerald" />
              <ProgressRow label="ATS compat." value={72} />
              <ProgressRow label="Impact words" value={80} tone="violet" />
              <ProgressRow label="Length" value={65} tone="amber" />
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>AI suggestions</CardTitle></CardHeader>
            <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
              <p>Critical: convert skills tables to ATS-readable bullet lists.</p>
              <p>Medium: quantify operational impact with team size, SLA and user scope.</p>
              <p>Good: keep the Olympics reference near the top of the summary.</p>
            </div>
            <div className="mt-4"><Button variant="primary">Apply all safe fixes</Button></div>
          </Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
