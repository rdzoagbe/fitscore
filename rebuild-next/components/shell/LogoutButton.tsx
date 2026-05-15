'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LogoutButtonProps {
  readonly variant?: 'sidebar' | 'standalone' | 'mobile'
}

export function LogoutButton({ variant = 'standalone' }: LogoutButtonProps): JSX.Element {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout(): Promise<void> {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      router.replace('/login?logged_out=1')
      router.refresh()
    }
  }

  const base = 'inline-flex items-center gap-2 transition disabled:opacity-60'
  const styles = variant === 'sidebar'
    ? 'w-full rounded-md px-2.5 py-2 text-[11px] text-slate-500 hover:bg-red-500/10 hover:text-red-400'
    : 'rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10'

  return (
    <button type="button" onClick={handleLogout} disabled={loading} className={`${base} ${styles}`}>
      <span aria-hidden="true">↪</span>
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
