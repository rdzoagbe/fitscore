import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getCoverLetterHistory } from '@/lib/cover-letter/history'
import { createClient } from '@/lib/supabase/server'
import { CoverLetterForm } from './CoverLetterForm'

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

function preview(content: string): string {
  return content.length > 420 ? `${content.slice(0, 420)}…` : content
}

export default async function CoverLettersPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const [cvVersions, letters] = await Promise.all([getCvVersions(user.id), getCoverLetterHistory(user.id, 8)])
  const latest = letters[0]

  return (
    <AppShell>
      <PageScaffold title="Cover Letters" subtitle="Generate, save and reuse tailored cover letters">
        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader><CardTitle>Generate letter</CardTitle></CardHeader>
            {cvVersions.length === 0 ? (
              <p className="rounded-md border border-amber/20 bg-amber/10 p-4 text-sm text-amber">Upload and parse a CV in CV Enhancer before generating a cover letter.</p>
            ) : <CoverLetterForm cvVersions={cvVersions} />}
          </Card>
          <Card>
            <CardHeader><CardTitle>Latest saved letter</CardTitle></CardHeader>
            {latest ? (
              <div className="rounded-md border border-border bg-elevated p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-accent">{latest.companyName ?? 'Company'} · {latest.jobTitle ?? 'Role'}</p>
                <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{preview(latest.content)}</pre>
              </div>
            ) : <p className="text-sm text-[var(--text-muted)]">No cover letters saved yet. Generate your first tailored letter.</p>}
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Saved cover letters</CardTitle></CardHeader>
          <div className="grid gap-3">
            {letters.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No saved cover letters yet.</p> : letters.map(letter => (
              <article key={letter.id} className="rounded-lg border border-border bg-elevated p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{letter.jobTitle ?? 'Cover letter'} · {letter.companyName ?? 'Company'}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{letter.language.toUpperCase()} · {letter.tone} · {new Date(letter.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{preview(letter.content)}</pre>
              </article>
            ))}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
