'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { createApplicationAction, type TrackerActionState } from './actions'

const initialState: TrackerActionState = {}

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus()
  return <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add application'}</Button>
}

export function ApplicationForm(): JSX.Element {
  const [state, formAction] = useFormState(createApplicationAction, initialState)

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Company<input name="companyName" required className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Company name" /></label>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Job title<input name="jobTitle" required className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="IT Manager" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Status<select name="status" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" defaultValue="wishlist"><option value="wishlist">Wishlist</option><option value="applied">Applied</option><option value="screening">Screening</option><option value="interview_1">Interview 1</option><option value="technical_test">Technical test</option><option value="offer">Offer</option></select></label>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Platform<input name="platform" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="LinkedIn / APEC" /></label>
        <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Applied date<input name="appliedAt" type="date" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" /></label>
      </div>
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Job URL<input name="jobUrl" type="url" className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="https://..." /></label>
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Job description<textarea name="jobDescription" className="min-h-32 rounded-md border border-border bg-elevated p-3 text-sm text-[var(--text-secondary)] outline-none" placeholder="Optional job description..." /></label>
      {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
      {state.message ? <p className="rounded-md border border-emerald/20 bg-emerald/10 p-3 text-xs text-emerald">{state.message}</p> : null}
      <div className="flex justify-end"><SubmitButton /></div>
    </form>
  )
}
