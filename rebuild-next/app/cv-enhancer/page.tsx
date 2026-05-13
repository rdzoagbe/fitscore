import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { ProgressRow } from '@/components/dashboard/ProgressRow'
import { AppShell } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { createClient } from '@/lib/supabase/server'
import { CvUploadForm } from './CvUploadForm'

type CvVersionRow = {
  id: string
  name: string
  file_name: string
  target_role: string | null
  parsed_text: string | null
  created_at: string
}

async function getCvVersions(userId: string): Promise<CvVersionRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('cv_versions')
    .select('id,name,file_name,target_role,parsed_text,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6)

  return (data ?? []) as CvVersionRow[]
}

export default async function CvEnhancerPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const cvVersions = await getCvVersions(user.id)
  const latest = cvVersions[0]
  const extractedLength = latest?.parsed_text?.length ?? 0

  return (
    <AppShell>
      <PageScaffold title="CV Enhancer" subtitle="Upload, parse and prepare CV versions for ATS analysis">
        <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle>Upload CV</CardTitle></CardHeader>
            <CvUploadForm />
          </Card>
          <Card>
            <CardHeader><CardTitle>Parsed CV readiness</CardTitle></CardHeader>
            <div className="grid gap-3">
              <ProgressRow label="Text extracted" value={extractedLength > 500 ? 95 : extractedLength > 100 ? 60 : 10} tone={extractedLength > 500 ? 'emerald' : 'amber'} />
              <ProgressRow label="ATS compat." value={latest ? 72 : 0} />
              <ProgressRow label="Version ready" value={latest ? 80 : 0} tone="violet" />
              <ProgressRow label="Length" value={latest ? 65 : 0} tone="amber" />
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
            <div className="mt-4"><Button variant="primary" disabled={!latest}>Apply all safe fixes</Button></div>
          </Card>
        </section>
        <Card>
          <CardHeader><CardTitle>Recent CV versions</CardTitle></CardHeader>
          <div className="grid gap-2">
            {cvVersions.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No CV versions yet.</p> : cvVersions.map(version => (
              <div key={version.id} className="grid gap-1 rounded-md border border-border bg-elevated p-3 text-sm text-[var(--text-secondary)] md:grid-cols-[1fr_auto] md:items-center">
                <span><strong className="text-[var(--text-primary)]">{version.name}</strong><br /><small>{version.file_name} · {version.target_role ?? 'General'}</small></span>
                <small>{new Date(version.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
