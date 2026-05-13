import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export default function LoginPage(): JSX.Element {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 py-10 text-[var(--text-primary)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">Joblytics AI</p>
            <CardTitle>Sign in</CardTitle>
          </div>
        </CardHeader>
        <form className="grid gap-3">
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Email<input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" type="email" placeholder="you@example.com" /></label>
          <label className="grid gap-2 text-xs text-[var(--text-secondary)]">Password<input className="min-h-11 rounded-md border border-border bg-elevated px-3 text-sm text-[var(--text-primary)] outline-none" type="password" placeholder="••••••••" /></label>
          <Button variant="primary" type="button">Continue</Button>
        </form>
        <p className="mt-4 text-xs text-[var(--text-muted)]">Phase 1 scaffold. Supabase auth actions will be wired in Phase 2. <Link href="/" className="text-accent">Back home</Link></p>
      </Card>
    </main>
  )
}
