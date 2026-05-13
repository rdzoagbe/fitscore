import { KpiCard } from '@/components/dashboard/KpiCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getInterviewHistory } from '@/lib/interview/history'
import { createClient } from '@/lib/supabase/server'
import { InterviewPrepForm } from './InterviewPrepForm'

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

export default async function InterviewPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const [cvVersions, sessions] = await Promise.all([getCvVersions(user.id), getInterviewHistory(user.id, 8)])
  const latest = sessions[0]
  const totalQuestions = sessions.reduce((sum, item) => sum + item.result.likely_questions.length, 0)
  const avgConfidence = sessions.length === 0 ? 0 : Math.round(sessions.reduce((sum, item) => sum + (item.confidenceScore ?? item.result.confidence_score), 0) / sessions.length)

  return (
    <AppShell>
      <PageScaffold title="Interview Prep" subtitle="Generate role-specific questions, STAR answers and talking points">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Sessions Done" value={String(sessions.length)} helper="Saved interview prep" />
          <KpiCard label="Q&A Prepared" value={String(totalQuestions)} helper="Generated questions" tone="emerald" />
          <KpiCard label="Confidence" value={sessions.length ? `${avgConfidence}%` : '—'} helper="Average readiness" tone="violet" />
          <KpiCard label="Latest Role" value={latest?.jobTitle ? 'Ready' : '—'} helper={latest?.jobTitle ?? 'Generate first prep'} tone="amber" />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Generate interview prep</CardTitle></CardHeader>
            {cvVersions.length === 0 ? (
              <p className="rounded-md border border-amber/20 bg-amber/10 p-4 text-sm text-amber">Upload and parse a CV in CV Enhancer before generating interview prep.</p>
            ) : <InterviewPrepForm cvVersions={cvVersions} />}
          </Card>
          <Card>
            <CardHeader><CardTitle>Latest session</CardTitle></CardHeader>
            {latest ? (
              <div className="grid gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-accent">{latest.companyName ?? 'Company'} · {latest.jobTitle ?? 'Role'}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{latest.result.role_pitch}</p>
                </div>
                <div className="grid gap-2">
                  {latest.result.likely_questions.slice(0, 4).map(item => <div key={item.question} className="rounded-md border border-border bg-elevated p-3 text-xs text-[var(--text-secondary)]">{item.question}</div>)}
                </div>
              </div>
            ) : <p className="text-sm text-[var(--text-muted)]">No interview prep saved yet.</p>}
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Saved interview sessions</CardTitle></CardHeader>
          <div className="grid gap-3">
            {sessions.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No saved sessions yet.</p> : sessions.map(session => (
              <article key={session.id} className="rounded-lg border border-border bg-elevated p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{session.jobTitle ?? 'Interview prep'} · {session.companyName ?? 'Company'}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{new Date(session.createdAt).toLocaleDateString()} · Confidence {(session.confidenceScore ?? session.result.confidence_score)}%</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{session.result.role_pitch}</p>
              </article>
            ))}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
