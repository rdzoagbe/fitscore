import Link from 'next/link'
import { PublicNav } from '@/components/shell/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-dvh bg-bg text-[var(--text-primary)]">
      <PublicNav />
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.22em] text-accent">Joblytics AI</p>
          <h1 className="font-display text-6xl italic leading-[0.95] tracking-tight md:text-7xl">Your job search cockpit for France and Europe.</h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">Score your CV against job descriptions, track applications, generate cover letters, prepare interviews, and export a France Travail IPR-ready dossier.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard"><Button variant="primary">Open cockpit</Button></Link><Link href="/pricing"><Button>See pricing</Button></Link></div>
        </div>
        <Card className="border-accent/20 bg-surface/80">
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Production preview</p>
          <div className="mt-6 grid gap-3">{['ATS score: structured scans','Applications tracked: real pipeline','Interview readiness: generated prep','IPR dossier: PDF + CSV export'].map(item => <div key={item} className="rounded-md border border-border bg-elevated px-4 py-3 text-sm text-[var(--text-secondary)]">{item}</div>)}</div>
        </Card>
      </section>
    </main>
  )
}
