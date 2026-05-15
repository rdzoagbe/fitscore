import Link from 'next/link'
import { PublicNav } from '@/components/shell/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const features = [
  {
    icon: '◎',
    name: 'ATS Scanner',
    description: 'Paste a job description and get an instant match score for your CV. See missing keywords, skill gaps, and actionable fixes before you apply.',
  },
  {
    icon: '⊞',
    name: 'Job Tracker',
    description: 'Manage every application in a visual kanban pipeline — from wishlist to offer. Never lose track of a follow-up or deadline again.',
  },
  {
    icon: '✦',
    name: 'AI Cover Letters',
    description: 'Generate a tailored, professional cover letter in seconds. Customised to the role and company, ready to send or refine.',
  },
  {
    icon: '◈',
    name: 'Interview Prep',
    description: 'Practice with role-specific questions generated from the job description. Get feedback and sharpen your answers before the real thing.',
  },
  {
    icon: '⬡',
    name: 'IPR Export',
    description: 'Export a complete France Travail IPR dossier as PDF or CSV. All your applications, dates, and outcomes formatted for unemployment benefit claims.',
  },
  {
    icon: '∿',
    name: 'Analytics',
    description: 'Track your response rate, interview conversion, and application velocity over time. Know what is working and where to double down.',
  },
] as const

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-dvh bg-bg text-[var(--text-primary)]">
      <PublicNav />

      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col items-center justify-center gap-6 px-5 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Joblytics AI</p>
        <h1 className="font-display max-w-3xl text-5xl italic leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
          Stop losing track of your job search.
        </h1>
        <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          One cockpit for your entire search — ATS scoring, application tracking, AI cover letters, interview prep, and your France Travail IPR dossier. All in one place.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="primary">Open cockpit</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary">See pricing</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-24">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl italic tracking-tight md:text-4xl">Everything your job search needs</h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Six tools, one platform, zero spreadsheets.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.name} className="flex flex-col gap-3">
              <span className="text-2xl text-accent">{feature.icon}</span>
              <h3 className="font-display text-lg italic text-[var(--text-primary)]">{feature.name}</h3>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-14 text-center">
        <p className="mx-auto max-w-lg text-base font-medium leading-7 text-[var(--text-secondary)]">
          Built for the modern job search in <span className="text-[var(--text-primary)]">France and Europe</span> — from your first application to your IPR dossier.
        </p>
      </section>

      <footer className="py-8 text-center">
        <p className="text-xs text-[var(--text-secondary)]">
          &copy; {new Date().getFullYear()} Joblytics AI. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
