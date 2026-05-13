import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { getEnhancedCvVersions } from '@/lib/cv-enhancer/history'
import { createClient } from '@/lib/supabase/server'
import { CvEnhanceForm } from './CvEnhanceForm'
import { CvUploadForm } from './CvUploadForm'

type CvVersionRow = {
  id: string
  name: string
  file_name: string
  target_role: string | null
  parsed_text: string | null
  ats_score: number | null
  created_at: string
}

type CvOption = {
  id: string
  name: string
  file_name: string
  target_role: string | null
}

async function getCvVersions(userId: string): Promise<CvVersionRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('cv_versions')
    .select('id,name,file_name,target_role,parsed_text,ats_score,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []) as CvVersionRow[]
}

function toCvOptions(rows: CvVersionRow[]): CvOption[] {
  return rows
    .filter(row => Boolean(row.parsed_text))
    .map(row => ({ id: row.id, name: row.name, file_name: row.file_name, target_role: row.target_role }))
}

function previewText(value: string | null): string {
  if (!value) return 'No enhanced CV text available.'
  return value.length > 900 ? `${value.slice(0, 900)}…` : value
}

export default async function CvEnhancerPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const [cvVersions, enhancedVersions] = await Promise.all([getCvVersions(user.id), getEnhancedCvVersions(user.id, 6)])
  const latest = cvVersions[0]
  const latestEnhanced = enhancedVersions[0]
  const extractedLength = latest?.parsed_text?.length ?? 0
  const cvOptions = toCvOptions(cvVersions)

  return (
    <AppShell>
      <PageScaffold title="CV Enhancer" subtitle="Upload, parse, improve and save role-specific CV versions">
        <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle>Upload CV</CardTitle></CardHeader>
            <CvUploadForm />
          </Card>
          <Card>
            <CardHeader><CardTitle>Parsed CV readiness</CardTitle></CardHeader>
            <div className="grid gap-3">
              <ProgressRow label="Text extracted" value={extractedLength > 500 ? 95 : extractedLength > 100 ? 60 : 10} tone={extractedLength > 500 ? 'emerald' : 'amber'} />
              <ProgressRow label="ATS compat." value={latest?.ats_score ?? (latest ? 72 : 0)} />
              <ProgressRow label="Version ready" value={latest ? 80 : 0} tone="violet" />
              <ProgressRow label="Enhanced CVs" value={Math.min(enhancedVersions.length * 20, 100)} tone={enhancedVersions.length > 0 ? 'emerald' : 'amber'} />
            </div>
            <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)]">
              {latest ? (
                <>
                  <p><strong className="text-[var(--text-primary)]">Latest:</strong> {latest.name} · {latest.file_name}</p>
                  <p><strong className="text-[var(--text-primary)]">Target:</strong> {latest.target_role ?? 'General CV'}</p>
                  <p><strong className="text-[var(--text-primary)]">Extracted text:</strong> {extractedLength.toLocaleString()} characters</p>
                </>
              ) : <p>No CV uploaded yet. Upload a PDF, DOCX or TXT file to create your first parsed CV version.</p>}
            </div>
          </Card>
        </section>
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader><CardTitle>Generate enhanced CV</CardTitle></CardHeader>
            {cvOptions.length === 0 ? <p className="rounded-md border border-amber/20 bg-amber/10 p-4 text-sm text-amber">Upload and parse a CV before generating an enhanced version.</p> : <CvEnhanceForm cvVersions={cvOptions} />}
          </Card>
          <Card>
            <CardHeader><CardTitle>Latest enhanced version</CardTitle></CardHeader>
            {latestEnhanced ? (
              <div className="rounded-md border border-border bg-elevated p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-accent">{latestEnhanced.name} · {latestEnhanced.atsScore ?? '—'}%</p>
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{previewText(latestEnhanced.parsedText)}</pre>
              </div>
            ) : <p className="text-sm text-[var(--text-muted)]">No enhanced CV generated yet.</p>}
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Recent CV versions</CardTitle></CardHeader>
          <div className="grid gap-2">
            {cvVersions.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No CV versions yet.</p> : cvVersions.map(version => (
              <div key={version.id} className="grid gap-1 rounded-md border border-border bg-elevated p-3 text-sm text-[var(--text-secondary)] md:grid-cols-[1fr_auto] md:items-center">
                <span><strong className="text-[var(--text-primary)]">{version.name}</strong><br /><small>{version.file_name} · {version.target_role ?? 'General'} · {version.ats_score ? `${version.ats_score}%` : 'No score'}</small></span>
                <small>{new Date(version.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
