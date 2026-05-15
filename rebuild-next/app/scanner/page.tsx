import { AppShell } from '@/components/shell/AppShell'
import { requireUserSession } from '@/lib/auth/profile-session'
import { createClient } from '@/lib/supabase/server'
import { ScannerForm } from './ScannerForm'

type CvOption = { id: string; name: string; file_name: string; target_role: string | null }

async function getCvVersions(userId: string): Promise<CvOption[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('cv_versions')
    .select('id,name,file_name,target_role')
    .eq('user_id', userId)
    .not('parsed_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as CvOption[]
}

async function getScanStats(userId: string): Promise<{ total: number; avg: number; best: number }> {
  const supabase = createClient()
  const { data } = await supabase
    .from('ats_analyses')
    .select('overall_score')
    .eq('user_id', userId)
    .not('overall_score', 'is', null)

  const scores = (data ?? []).map(r => (r as { overall_score: number }).overall_score)
  const total = scores.length
  const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0
  const best = total > 0 ? Math.max(...scores) : 0
  return { total, avg, best }
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function ScannerPage(): Promise<JSX.Element> {
  const user = await requireUserSession()
  const [cvVersions, stats] = await Promise.all([getCvVersions(user.id), getScanStats(user.id)])
  const firstName = user.name.split(' ')[0] ?? user.name

  return (
    <AppShell>
      <ScannerForm
        cvVersions={cvVersions}
        stats={stats}
        greeting={getGreeting()}
        firstName={firstName}
      />
    </AppShell>
  )
}
