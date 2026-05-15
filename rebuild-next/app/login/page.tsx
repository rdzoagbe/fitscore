import Link from 'next/link'
import { PublicNav } from '@/components/shell/PublicNav'
import { LoginForm } from './LoginForm'

interface LoginPageProps {
  readonly searchParams?: {
    readonly next?: string
    readonly error?: string
    readonly logged_out?: string
  }
}

function safeParam(value: string | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export default function LoginPage({ searchParams }: LoginPageProps): JSX.Element {
  const nextPath = safeParam(searchParams?.next, '/dashboard')
  const initialError = safeParam(searchParams?.error)
  const loggedOut = searchParams?.logged_out === '1'

  return (
    <main className="min-h-dvh bg-[#0f172a] text-slate-200">
      <PublicNav />
      <section className="grid min-h-[calc(100dvh-4rem)] place-items-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-400 font-semibold text-white">J</span>
            <span className="text-xl font-semibold text-slate-200">Joblytics</span>
          </Link>
          <LoginForm nextPath={nextPath} initialError={initialError || undefined} loggedOut={loggedOut} />
        </div>
      </section>
    </main>
  )
}
