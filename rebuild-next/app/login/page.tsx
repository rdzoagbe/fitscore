import Link from 'next/link'
import { Suspense } from 'react'
import { PublicNav } from '@/components/shell/PublicNav'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoginForm } from './LoginForm'

export default function LoginPage(): JSX.Element {
  return (
    <main className="min-h-dvh bg-bg text-[var(--text-primary)]">
      <PublicNav />
      <section className="grid min-h-[calc(100dvh-4rem)] place-items-center px-5 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-accent">Joblytics AI</p>
              <CardTitle>Sign in</CardTitle>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Access your protected job search cockpit.</p>
            </div>
          </CardHeader>
          <Suspense fallback={<p className="text-xs text-[var(--text-muted)]">Loading sign-in form…</p>}>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-xs text-[var(--text-muted)]"><Link href="/" className="text-accent">Back home</Link></p>
        </Card>
      </section>
    </main>
  )
}
