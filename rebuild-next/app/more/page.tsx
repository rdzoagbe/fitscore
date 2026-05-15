import Link from 'next/link'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { navGroups } from '@/components/shell/NavLinks'
import { PreferenceControls } from '@/components/shell/PreferenceControls'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export default function MorePage(): JSX.Element {
  return (
    <AppShell>
      <PageScaffold title="More" subtitle="All Joblytics pages in one mobile-friendly menu">
        <section className="rounded-lg border border-border bg-elevated p-4 md:hidden">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Preferences</p>
          <PreferenceControls />
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          {navGroups.map(group => (
            <Card key={group.title}>
              <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
              <div className="grid gap-2">
                {group.items.map(item => (
                  <Link key={item.href} href={item.href} className="rounded-md border border-border bg-elevated p-4 transition hover:border-[var(--border-strong)]">
                    <strong className="block text-sm text-[var(--text-primary)]">{item.label}</strong>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{item.description}</span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </section>
      </PageScaffold>
    </AppShell>
  )
}
