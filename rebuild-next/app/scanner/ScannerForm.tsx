'use client'

import { useState, useTransition, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { runScannerAction, deleteCvAction, type ScannerState } from './actions'
import type { AtsHistoryItem } from '@/lib/ats/history'

type CvOption = {
  readonly id: string
  readonly name: string
  readonly file_name: string
  readonly target_role: string | null
}

type Stats = {
  readonly total: number
  readonly avg: number
  readonly best: number
}

const emptyScan: ScannerState = {}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'border-emerald-500/30 bg-emerald-500/10'
  if (score >= 50) return 'border-amber-500/30 bg-amber-500/10'
  return 'border-red-500/30 bg-red-500/10'
}

function jobLabel(item: AtsHistoryItem): string {
  if (item.jobTitle) return item.jobTitle
  if (item.jobUrl) {
    try { return new URL(item.jobUrl).hostname.replace('www.', '') } catch { /* ignore */ }
  }
  return 'Job analysis'
}

function ScanSubmitButton(): JSX.Element {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-[var(--accent)] py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Analyzing… (~15s)' : 'Run ATS check →'}
    </button>
  )
}

export function ScannerForm({ cvVersions, stats, greeting, firstName, history }: {
  readonly cvVersions: CvOption[]
  readonly stats: Stats
  readonly greeting: string
  readonly firstName: string
  readonly history: AtsHistoryItem[]
}): JSX.Element {
  const router = useRouter()
  const [scanState, scanFormAction] = useFormState(runScannerAction, emptyScan)

  const [jobUrl, setJobUrl] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedCvId, setSelectedCvId] = useState(cvVersions[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Upload state (fetch-based)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedCv = cvVersions.find(cv => cv.id === selectedCvId) ?? cvVersions[0]
  const isLinkedIn = jobUrl.includes('linkedin.com/jobs/')
  const hasCV = cvVersions.length > 0

  async function handleUpload(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) { setUploadError('Choose a file first.'); return }
    setUploading(true)
    setUploadError(null)
    const body = new FormData()
    body.append('cvFile', file)
    body.append('label', 'Base CV')
    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', body })
      const data = await res.json() as { error?: string; message?: string }
      if (!res.ok || data.error) {
        setUploadError(data.error ?? 'Upload failed.')
      } else {
        setShowUpload(false)
        router.refresh()
      }
    } catch {
      setUploadError('Network error — please try again.')
    } finally {
      setUploading(false)
    }
  }

  function handleDelete(): void {
    if (!selectedCv || !confirm('Remove this CV version?')) return
    startTransition(async () => {
      const result = await deleteCvAction(selectedCv.id)
      if (!result.error) router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Greeting */}
      <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
        {greeting}, {firstName} 👋
      </h2>

      {/* Stats */}
      <div className="mb-8 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Analyses', value: stats.total, color: 'text-[var(--text-primary)]' },
          { label: 'Avg Score', value: stats.avg > 0 ? `${stats.avg}%` : '—', color: 'text-[var(--accent)]' },
          { label: 'Best Score', value: stats.best > 0 ? `${stats.best}%` : '—', color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Scan form */}
      <form action={scanFormAction} className="grid gap-5">
        <input type="hidden" name="cvVersionId" value={selectedCv?.id ?? ''} />
        <input type="hidden" name="language" value="en" />
        <input type="hidden" name="jobUrl" value={jobUrl} />
        <input type="hidden" name="jobTitle" value={jobTitle} />

        {/* Job input */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Job offer
          </label>

          {!pasteMode ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3">
                <span className="text-slate-500">🔗</span>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://linkedin.com/jobs/... or indeed.com/..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-600"
                />
              </div>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Job title (optional, e.g. Senior Product Manager)"
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-600"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">Works with Indeed, WTTJ, Glassdoor. LinkedIn may block access.</p>

              {isLinkedIn && (
                <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold text-amber-400">LinkedIn often blocks automated reading</p>
                  <p className="mt-0.5 text-xs text-amber-300/70">Copy the job description and paste it below for best results.</p>
                  <button type="button" onClick={() => setPasteMode(true)} className="mt-1.5 text-xs font-medium text-amber-400 hover:underline">
                    Switch to paste mode →
                  </button>
                </div>
              )}

              <div className="mt-3 text-center">
                <button type="button" onClick={() => setPasteMode(true)} className="text-sm font-medium text-[var(--accent)] hover:underline">
                  OR paste job description text
                </button>
              </div>
            </>
          ) : (
            <div>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Job title (optional, e.g. Senior Product Manager)"
                className="mb-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-600"
              />
              <textarea
                name="jobDescription"
                className="min-h-40 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                placeholder="Paste the full job description here…"
                required
              />
              <button type="button" onClick={() => setPasteMode(false)} className="mt-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
                ← Use URL instead
              </button>
            </div>
          )}
        </div>

        {/* CV section */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Your CV</label>

          {hasCV && !showUpload ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="mb-3 text-xs font-semibold text-emerald-400">✓ Saved &amp; Ready!</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-800 text-[10px] font-bold text-slate-400">PDF</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{selectedCv?.file_name ?? selectedCv?.name}</p>
                    {selectedCv?.target_role && <p className="text-xs text-[var(--text-muted)]">{selectedCv.target_role}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <a href={`/api/cv/view?id=${selectedCv?.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-slate-400 transition hover:text-[var(--text-primary)]" title="Preview CV">👁</a>
                  <button type="button" onClick={() => setShowUpload(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-sm text-slate-400 transition hover:text-[var(--text-primary)]" title="Replace CV">↑</button>
                  <button type="button" onClick={handleDelete} disabled={isPending}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400 transition hover:text-red-300 disabled:opacity-50" title="Delete CV">🗑</button>
                </div>
              </div>

              {cvVersions.length > 1 && (
                <select value={selectedCvId} onChange={e => setSelectedCvId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-secondary)] outline-none">
                  {cvVersions.map(cv => <option key={cv.id} value={cv.id}>{cv.name} — {cv.file_name}</option>)}
                </select>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
              {showUpload ? 'Upload a new CV below ↓' : 'Upload your CV below to get started ↓'}
            </div>
          )}
        </div>

        {scanState.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{scanState.error}</div>
        )}
        {scanState.warning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
            Analysis completed, but save failed: {scanState.warning}
          </div>
        )}

        {hasCV && !showUpload && (
          pasteMode
            ? <ScanSubmitButton />
            : (
              <button type="button" onClick={() => setPasteMode(true)}
                className="w-full rounded-xl bg-[var(--accent)] py-4 text-base font-semibold text-white transition hover:opacity-90">
                Run ATS check →
              </button>
            )
        )}

        <p className="text-center text-[11px] text-[var(--text-muted)]">Processing takes ~15 seconds</p>
      </form>

      {/* CV upload (fetch-based) */}
      {(!hasCV || showUpload) && (
        <form onSubmit={handleUpload} className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            {showUpload ? 'Upload a new CV' : 'Upload your CV to get started'}
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center transition hover:border-[var(--accent)]/50">
            <span className="text-3xl">📄</span>
            <span className="text-sm font-medium text-[var(--text-secondary)]">Click to select file</span>
            <span className="text-xs text-[var(--text-muted)]">PDF, DOCX or TXT · max 8 MB</span>
            <input ref={fileInputRef} type="file" name="cvFile"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="sr-only" />
          </label>
          {uploadError && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{uploadError}</div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={uploading}
              className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {uploading ? 'Uploading…' : 'Upload CV'}
            </button>
            {showUpload && (
              <button type="button" onClick={() => { setShowUpload(false); setUploadError(null) }}
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Scan result */}
      {scanState.result && (
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--accent)]">ATS Result</p>
              <h3 className="text-5xl font-bold text-[var(--text-primary)]">{scanState.result.overall_score}%</h3>
            </div>
            <p className="max-w-md text-sm leading-6 text-[var(--text-secondary)]">{scanState.result.summary}</p>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-5">
            {Object.entries(scanState.result.scores).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{key}</p>
                <strong className="text-xl text-[var(--text-primary)]">{value}%</strong>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Matched keywords</h4>
              <div className="flex flex-wrap gap-2">
                {scanState.result.matched_keywords.slice(0, 12).map(item => (
                  <span key={item.keyword} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">{item.keyword}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Missing keywords</h4>
              <div className="flex flex-wrap gap-2">
                {scanState.result.missing_keywords.slice(0, 12).map(item => (
                  <span key={item.keyword} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400">{item.keyword}</span>
                ))}
              </div>
            </div>
          </div>
          {scanState.result.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Top recommendations</h4>
              <div className="grid gap-2">
                {scanState.result.recommendations.slice(0, 4).map((rec, i) => (
                  <div key={i} className={`rounded-xl border p-3 text-xs ${rec.priority === 'critical' ? 'border-red-500/30 bg-red-500/10' : rec.priority === 'medium' ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                    <p className="font-semibold text-[var(--text-primary)]">{rec.category}: {rec.issue}</p>
                    <p className="mt-0.5 text-[var(--text-secondary)]">{rec.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* History board */}
      {history.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">Application Intelligence</p>
              <h3 className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]">History Board</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{history.length} scan{history.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid gap-2">
            {history.map(item => {
              const score = item.overallScore ?? item.result.overall_score
              const label = jobLabel(item)
              const date = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              const isExpanded = expandedId === item.id

              return (
                <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-white/[0.02] transition"
                  >
                    {/* Score badge */}
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${scoreBg(score)} ${scoreColor(score)}`}>
                      {score}%
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{label}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {item.cvVersion?.name ?? 'CV'} · {date}
                      </p>
                    </div>

                    {/* Missing keyword chips */}
                    <div className="hidden shrink-0 items-center gap-1 sm:flex">
                      {item.result.missing_keywords.slice(0, 3).map(k => (
                        <span key={k.keyword} className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">{k.keyword}</span>
                      ))}
                    </div>

                    <span className="ml-1 shrink-0 text-xs text-[var(--text-muted)]">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--border)] px-4 py-4">
                      {/* Score breakdown */}
                      <div className="mb-3 grid grid-cols-5 gap-2">
                        {Object.entries(item.result.scores).map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-center">
                            <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{key}</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{value}%</p>
                          </div>
                        ))}
                      </div>

                      <p className="mb-3 text-xs leading-5 text-[var(--text-secondary)]">{item.result.summary}</p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Matched</p>
                          <div className="flex flex-wrap gap-1">
                            {item.result.matched_keywords.slice(0, 8).map(k => (
                              <span key={k.keyword} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">{k.keyword}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">Missing</p>
                          <div className="flex flex-wrap gap-1">
                            {item.result.missing_keywords.slice(0, 8).map(k => (
                              <span key={k.keyword} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">{k.keyword}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {item.jobUrl && (
                        <a href={item.jobUrl} target="_blank" rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                          View original job posting ↗
                        </a>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
