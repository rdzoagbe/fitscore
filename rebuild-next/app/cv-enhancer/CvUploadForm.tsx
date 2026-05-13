'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { uploadCvAction, type CvUploadState } from './actions'

const initialState: CvUploadState = {}

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus()
  return <Button variant="primary" type="submit" disabled={pending}>{pending ? 'Uploading…' : 'Upload and parse CV'}</Button>
}

export function CvUploadForm(): JSX.Element {
  const [state, formAction] = useFormState(uploadCvAction, initialState)

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
        CV label
        <input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" name="label" placeholder="Base CV — IT Manager" />
      </label>
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
        Target role
        <input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" name="targetRole" placeholder="Business Applications Manager" />
      </label>
      <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
        CV file
        <input className="rounded-md border border-dashed border-border bg-elevated p-4 text-sm text-[var(--text-secondary)]" name="cvFile" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" required />
      </label>
      {state.error ? <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-xs text-danger">{state.error}</p> : null}
      {state.message ? <p className="rounded-md border border-emerald/20 bg-emerald/10 p-3 text-xs text-emerald">{state.message}</p> : null}
      <SubmitButton />
    </form>
  )
}
