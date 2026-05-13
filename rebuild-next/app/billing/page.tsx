import Link from 'next/link'
import { UsageCard, usageMetricsFromSnapshot } from '@/components/billing/UsageCard'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'
import { formatPrice } from '@/lib/billing/plans'
import { getUserPlan, isCheckoutConfigured } from '@/lib/billing/profile-plan'
import { getUsageSnapshot } from '@/lib/billing/usage'

export default async function BillingPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const plan = await getUserPlan(user.id)
  const usage = await getUsageSnapshot(user.id, plan.id)
  const checkoutReady = isCheckoutConfigured()
  const metrics = usageMetricsFromSnapshot(usage)

  return (
    <AppShell>
      <PageScaffold title="Billing & Usage" subtitle="Your current plan, feature limits and remaining usage">
        <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle>Current plan</CardTitle></CardHeader>
            <div className="rounded-md border border-border bg-elevated p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-accent">{plan.name}</p>
              <p className="mt-3 font-display text-5xl italic text-[var(--text-primary)]">{formatPrice(plan)}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{plan.description}</p>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
              {plan.features.map(feature => <p key={feature}>✓ {feature}</p>)}
            </div>
            <div className="mt-5 grid gap-3">
              <Link href="/pricing" className="rounded-md bg-accent px-4 py-3 text-center text-sm font-medium text-slate-950 transition hover:opacity-90">View plans</Link>
              {!checkoutReady ? <p className="text-xs leading-6 text-[var(--text-muted)]">Checkout is prepared but not active yet. No payment is taken from this preview build.</p> : null}
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Usage this month</CardTitle></CardHeader>
            <div className="grid gap-3 md:grid-cols-2">
              {metrics.map(metric => <UsageCard key={metric.label} metric={metric} />)}
            </div>
          </Card>
        </section>
      </PageScaffold>
    </AppShell>
  )
}
