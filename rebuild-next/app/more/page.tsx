import Link from 'next/link'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

const groups = [
  {
    title: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', description: 'Main cockpit overview' },
      { href: '/tracker', label: 'Job Tracker', description: 'Applications, statuses and follow-up intelligence' },
      { href: '/scanner', label: 'ATS Scanner', description: 'Compare CV versions against job descriptions' },
      { href: '/cover-letters', label: 'Cover Letters', description: 'Generate and review saved letters' }
    ]
  },
  {
    title: 'Prepare',
    items: [
      { href: '/interview', label: 'Interview Prep', description: 'Generate role-specific interview preparation' },
      { href: '/cv-enhancer', label: 'CV Enhancer', description: 'Upload, parse and improve CV versions' },
      { href: '/keywords', label: 'Keywords', description: 'Keyword intelligence from ATS history' }
    ]
  },
  {
    title: 'Reports',
    items: [
      { href: '/analytics', label: 'Analytics', description: 'Conversion rates, platforms and trends' },
      { href: '/export-ipr', label: 'Export IPR', description: 'France Travail evidence dossier export' }
    ]
  },
  {
    title: 'Account',
    items: [
      { href: '/billing', label: 'Billing & Usage', description: 'Current plan and usage limits' },
      { href: '/pricing', label: 'Pricing', description: 'Public plans and checkout-safe pricing' },
      { href: '/logout', label: 'Logout', description: 'End this session securely' }
    ]
  }
]

export default function MorePage(): JSX.Element {
  return (
    <AppShell>
      <PageScaffold title="More" subtitle="All Joblytics pages in one mobile-friendly menu">
        <section className="grid gap-4 xl:grid-cols-2">
          {groups.map(group => (
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
