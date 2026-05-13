import Link from 'next/link'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatPrice, plans, type PlanDefinition } from '@/lib/billing/plans'
import { isCheckoutConfigured } from '@/lib/billing/profile-plan'

const planList: PlanDefinition[] = [plans.free, plans.tier, plans.pro]

function limitRows(plan: PlanDefinition): Array<[string, string]> {
  return [
    ['ATS scans / month', String(plan.limits.atsScansPerMonth)],
    ['CV versions', String(plan.limits.cvUploads)],
    ['Cover letters / month', String(plan.limits.coverLettersPerMonth)],
    ['Interview prep / month', String(plan.limits.interviewPrepsPerMonth)],
    ['Tracked applications', String(plan.limits.trackedApplications)],
    ['IPR exports / month', String(plan.limits.iprExportsPerMonth)]
  ]
}

function PlanCard({ plan, checkoutReady }: { readonly plan: PlanDefinition; readonly checkoutReady: boolean }): JSX.Element {
  const isPaid = plan.priceMonthly > 0

  return (
    <Card className={plan.id === 'tier' ? 'border-accent/40' : ''}>
      <CardHeader>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">{plan.id === 'tier' ? 'Recommended' : plan.name}</p>
          <CardTitle>{plan.name}</CardTitle>
          <p className="mt-2 font-display text-4xl italic text-[var(--text-primary)]">{formatPrice(plan)}</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{plan.description}</p>
        </div>
      </CardHeader>
      <div className="grid gap-3">
        <div className="grid gap-2 text-sm text-[var(--text-secondary)]">
          {limitRows(plan).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-md border border-border bg-elevated px-3 py-2">
              <span>{label}</span>
              <strong className="text-[var(--text-primary)]">{value}</strong>
            </div>
          ))}
        </div>
        <div className="grid gap-2 pt-2 text-sm text-[var(--text-secondary)]">
          {plan.features.map(feature => <p key={feature}>✓ {feature}</p>)}
        </div>
        {isPaid ? (
          checkoutReady ? (
            <a href={`/api/billing/checkout?plan=${plan.id}`} className="mt-3 rounded-md bg-accent px-4 py-3 text-center text-sm font-medium text-slate-950 transition hover:opacity-90">Start {plan.name}</a>
          ) : (
            <Link href="/login" className="mt-3 rounded-md border border-border bg-elevated px-4 py-3 text-center text-sm text-[var(--text-primary)] transition hover:border-[var(--border-strong)]">Join early access</Link>
          )
        ) : (
          <Link href="/login" className="mt-3 rounded-md bg-accent px-4 py-3 text-center text-sm font-medium text-slate-950 transition hover:opacity-90">Start free</Link>
        )}
      </div>
    </Card>
  )
}

export default function PricingPage(): JSX.Element {
  const checkoutReady = isCheckoutConfigured()

  return (
    <AppShell>
      <PageScaffold title="Pricing" subtitle="Clear limits for every stage of your job search cockpit">
        <section className="rounded-lg border border-border bg-elevated p-4 text-sm leading-6 text-[var(--text-secondary)]">
          {checkoutReady ? (
            <p><strong className="text-[var(--text-primary)]">Checkout is active.</strong> Paid plans can be started from this page.</p>
          ) : (
            <p><strong className="text-[var(--text-primary)]">Checkout is prepared but not active yet.</strong> Paid plans are shown for transparency; no payment is taken from this preview build.</p>
          )}
        </section>
        <section className="grid gap-4 xl:grid-cols-3">
          {planList.map(plan => <PlanCard key={plan.id} plan={plan} checkoutReady={checkoutReady} />)}
        </section>
      </PageScaffold>
    </AppShell>
  )
}
