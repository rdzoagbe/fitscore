'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function LinkedInForm(): JSX.Element {
  const [url, setUrl] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!url.trim()) { setError('Enter your LinkedIn profile URL.'); return }
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/linkedin/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), targetRole: targetRole.trim() })
      })
      const data = await res.json() as { feedback?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to optimize')
      setResult(data.feedback ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Target role <span className="normal-case text-[var(--text-muted)]">(optional)</span>
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              LinkedIn profile URL
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/yourname"
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Make sure your profile is set to public.</p>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>
          )}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Analyzing…' : 'Optimize my profile →'}
          </Button>
        </form>
      </Card>

      <div>
        {result ? (
          <Card>
            <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">Profile feedback</h3>
            <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{result}</div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-3xl opacity-40">🔗</span>
            <p className="text-sm text-[var(--text-muted)]">Your section-by-section feedback will appear here.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
