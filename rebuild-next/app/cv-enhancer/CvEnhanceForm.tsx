'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { enhanceCvAction, type CvEnhanceState } from './enhance-actions'

type CvOption = {
  readonly id: string
  readonly name: string
  readonly file_name: string
  readonly target_role: string | null
}

const initialState: CvEnhanceState = {}

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus()
  return <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Enhancing…' : 'Generate enhanced CV'}</Button>
}

export function CvEnhanceForm({ cvVersions }: { readonly cvVersions: CvOption[] }): JSX.Element {
  const [state, formAction] = useFormState(enhanceCvAction, initialState)

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-4">
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
          Source CV
          <select name="cvVersionId" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" required>
            <option value="">Choose a parsed CV</option>
            {cvVersions.map(cv => <option key={cv.id} value={cv.id}>{cv.name} — {cv.target_role ?? cv.file_name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Target role<input name="targetRole" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" required placeholder="IT Manager" /></label>
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Language<select name="language" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" defaultValue="en"><option value="en">English</option><option value="fr">French</option></select></label>
        </div>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Enhancement style<select name="style" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" defaultValue="ats"><option value="ats">ATS optimized</option><option value="executive">Executive</option><option value="concise">Concise</option><option value="impact">Impact-focused</option></select></label>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Optional job description<textarea name="jobDescription" className="min-h-40 w-full rounded-md border border-border bg-elevated p-4 text-sm text-[var(--text-secondary)] outline-none" placeholder="Paste a target job description for stronger tailoring..." /></label>
        {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
        {state.warning ? <p className="rounded-md border border-amber/20 bg-amber/10 p-3 text-xs text-amber">Enhanced CV generated, but save failed: {state.warning}</p> : null}
        <div className="flex justify-end"><SubmitButton /></div>
      </form>
      {state.result ? (
        <section className="rounded-lg border border-border bg-elevated p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-accent">Enhanced CV output</p>
          <div className="mb-4 rounded-md border border-border bg-surface p-4">
            <p className="text-xs text-[var(--text-muted)]">Readiness score</p>
            <strong className="font-display text-4xl italic text-[var(--text-primary)]">{state.result.readiness_score}%</strong>
          </div>
          <h3 className="font-display text-2xl italic text-[var(--text-primary)]">Improved summary</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{state.result.improved_summary}</p>
          <div className="mt-5 grid gap-3">
            {state.result.rewritten_bullets.slice(0, 5).map(item => (
              <article key={item.after} className="rounded-md border border-border bg-surface p-4">
                <p className="text-sm leading-6 text-[var(--text-primary)]">{item.after}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{item.rationale}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
