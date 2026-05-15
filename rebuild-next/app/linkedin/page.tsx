import { AppShell } from '@/components/shell/AppShell'
import { PageScaffold } from '@/components/dashboard/PageScaffold'
import { LinkedInForm } from './LinkedInForm'

export default function LinkedInPage(): JSX.Element {
  return (
    <AppShell>
      <PageScaffold
        title="LinkedIn Optimizer"
        subtitle="Make your profile recruiter-magnet ready"
      >
        <LinkedInForm />
      </PageScaffold>
    </AppShell>
  )
}
