import Link from 'next/link'
export default function NotFound(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-4">
      <h1 className="text-xl text-slate-200">Page not found</h1>
      <Link href="/dashboard" className="px-5 py-2 rounded-lg bg-sky-400 text-slate-900 font-semibold text-sm">Go to dashboard</Link>
    </div>
  )
}
