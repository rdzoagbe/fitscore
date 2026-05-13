import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'

const questions = [
  'Describe your experience managing Microsoft 365 in a multi-site enterprise.',
  'Tell me about a time you managed a critical incident under pressure.',
  'How would you onboard 200 users to a new application in four weeks?',
  'Why this company and why this role now?'
]

export default function InterviewPage(): JSX.Element {
  return (
    <PageScaffold title="Interview Prep" subtitle="Practice role-specific answers with structured examples">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sessions Done" value="8" helper="This week: 3" />
        <KpiCard label="Q&A Prepared" value="34" helper="For Summit Paris" tone="emerald" />
        <KpiCard label="Confidence" value="82%" helper="+12pts this week" tone="violet" />
        <KpiCard label="Next Interview" value="2d" helper="May 15 · 14h00" tone="amber" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader><CardTitle>Question bank</CardTitle></CardHeader>
          <div className="grid gap-3">
            {questions.map(question => <div key={question} className="rounded-md border border-border bg-elevated p-4 text-sm text-[var(--text-secondary)]">{question}</div>)}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Session actions</CardTitle></CardHeader>
          <div className="grid gap-3"><Button variant="primary">Start mock interview</Button><Button>Generate STAR answers</Button><Button>Build salary script</Button></div>
        </Card>
      </section>
    </PageScaffold>
  )
}
