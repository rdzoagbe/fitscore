import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { AppShell } from '@/components/shell/AppShell'
import { LogoutButton } from '@/components/shell/LogoutButton'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { requireUserSession } from '@/lib/auth/profile-session'

export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUserSession()

  return (
    <AppShell>
      <PageScaffold title="Settings" subtitle="Account, profile, preferences and session controls">
        <section className="grid gap-4 xl:grid-cols-[1fr_24rem]">
          <Card>
            <CardHeader>
              <CardTitle>Account profile</CardTitle>
            </CardHeader>
            <div className="grid gap-4 text-sm">
              <div className="grid gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Name</span>
                <strong className="text-slate-200">{user.name}</strong>
              </div>
              <div className="grid gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Email</span>
                <strong className="text-slate-200">{user.email}</strong>
              </div>
              <div className="grid gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Plan</span>
                <strong className="text-sky-400">Free plan</strong>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <p className="mb-4 text-sm leading-6 text-slate-400">
              Use this control to securely end your session. After sign-out, protected pages redirect back to login.
            </p>
            <LogoutButton />
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <p className="text-sm leading-6 text-slate-400">
            Theme and language controls are available in the topbar. The next production step is to persist these preferences into the profile table.
          </p>
        </Card>
      </PageScaffold>
    </AppShell>
  )
}
