'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { generateCoverLetterAction, type CoverLetterState } from './actions'

type CvOption = {
  readonly id: string
  readonly name: string
  readonly file_name: string
  readonly target_role: string | null
}

const initialState: CoverLetterState = {}

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus()
  return <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Generating…' : 'Generate cover letter'}</Button>
}

export function CoverLetterForm({ cvVersions }: { readonly cvVersions: CvOption[] }): JSX.Element {
  const [state, formAction] = useFormState(generateCoverLetterAction, initialState)

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
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Company name<input name="companyName" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" required placeholder="Summit Paris" /></label>
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Job title<input name="jobTitle" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" required placeholder="Business Applications Manager" /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Language<select name="language" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" defaultValue="en"><option value="en">English</option><option value="fr">French</option></select></label>
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Tone<select name="tone" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" defaultValue="professional"><option value="professional">Professional</option><option value="confident">Confident</option><option value="warm">Warm</option><option value="executive">Executive</option></select></label>
        </div>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Job description<textarea name="jobDescription" className="min-h-56 w-full rounded-md border border-border bg-elevated p-4 text-sm text-[var(--text-secondary)] outline-none" required placeholder="Paste the job description here..." /></label>
        {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
        {state.warning ? <p className="rounded-md border border-amber/20 bg-amber/10 p-3 text-xs text-amber">Letter generated, but save failed: {state.warning}</p> : null}
        <div className="flex justify-end"><SubmitButton /></div>
      </form>
      {state.content ? (
        <section className="rounded-lg border border-border bg-elevated p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-accent">Generated letter</p>
          <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{state.content}</pre>
        </section>
      ) : null}
    </div>
  )
}
