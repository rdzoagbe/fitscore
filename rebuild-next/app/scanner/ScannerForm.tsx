'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { runScannerAction, type ScannerState } from './actions'

type CvOption = {
  readonly id: string
  readonly name: string
  readonly file_name: string
  readonly target_role: string | null
}

const initialState: ScannerState = {}

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus()
  return <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Analyzing…' : 'Run ATS scan'}</Button>
}

export function ScannerForm({ cvVersions }: { readonly cvVersions: CvOption[] }): JSX.Element {
  const [state, formAction] = useFormState(runScannerAction, initialState)

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-4">
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
          CV version
          <select name="cvVersionId" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" required>
            <option value="">Choose a parsed CV</option>
            {cvVersions.map(cv => <option key={cv.id} value={cv.id}>{cv.name} — {cv.target_role ?? cv.file_name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
          Language
          <select name="language" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" defaultValue="en">
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
          Job description
          <textarea name="jobDescription" className="min-h-80 w-full rounded-md border border-border bg-elevated p-4 text-sm text-[var(--text-secondary)] outline-none" placeholder="Paste a job description here..." required />
        </label>
        {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
        <div className="flex justify-end"><SubmitButton /></div>
      </form>
      {state.result ? (
        <section className="rounded-lg border border-border bg-elevated p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent">ATS result</p>
              <h3 className="font-display text-4xl italic">{state.result.overall_score}%</h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{state.result.summary}</p>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {Object.entries(state.result.scores).map(([key, value]) => (
              <div key={key} className="rounded-md border border-border bg-surface p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{key}</p>
                <strong className="text-xl text-[var(--text-primary)]">{value}%</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm text-[var(--text-primary)]">Matched keywords</h4>
              <div className="flex flex-wrap gap-2">{state.result.matched_keywords.slice(0, 12).map(item => <span key={item.keyword} className="rounded border border-emerald/20 bg-emerald/10 px-2 py-1 text-xs text-emerald">{item.keyword}</span>)}</div>
            </div>
            <div>
              <h4 className="mb-2 text-sm text-[var(--text-primary)]">Missing keywords</h4>
              <div className="flex flex-wrap gap-2">{state.result.missing_keywords.slice(0, 12).map(item => <span key={item.keyword} className="rounded border border-amber/20 bg-amber/10 px-2 py-1 text-xs text-amber">{item.keyword}</span>)}</div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
