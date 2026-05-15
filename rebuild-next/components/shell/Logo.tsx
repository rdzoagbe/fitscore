'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Logo(): JSX.Element {
  const [href, setHref] = useState('/')

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: { session } }) => setHref(session ? '/dashboard' : '/'))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setHref(session ? '/dashboard' : '/')
      })
      return () => subscription.unsubscribe()
    } catch {
      setHref('/')
      return undefined
    }
  }, [])

  return (
    <Link href={href} className="flex items-center gap-2 no-underline" aria-label="Joblytics home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-400 text-sm font-semibold text-white">J</span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold text-slate-200">Joblytics</span>
        <span className="mt-1 text-[9px] tracking-wider text-slate-500">JOB SEARCH COCKPIT</span>
      </span>
    </Link>
  )
}
