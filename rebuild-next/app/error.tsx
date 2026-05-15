'use client'
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }): JSX.Element {
  return (
    <html><body className="bg-[#0f172a] min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-400 text-sm">{error.message}</p>
      <button onClick={reset} className="px-5 py-2 rounded-lg bg-sky-400 text-slate-900 font-semibold text-sm">Try again</button>
    </body></html>
  )
}
