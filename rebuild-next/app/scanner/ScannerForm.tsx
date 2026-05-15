'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { runScannerAction, type ScannerState } from './actions'

type CvOption = {
  readonly id: string
  readonly name: string
  readonly file_name: string
  readonly target_role: string | null
}

const initialState: ScannerState = {}

function isLinkedInJobUrl(url: string): boolean {
  return url.includes('linkedin.com/jobs/')
}

function SubmitButton(): JSX.Element {
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

export function ScannerForm({ cvVersions }: { readonly cvVersions: CvOption[] }): JSX.Element {
  const [state, formAction] = useFormState(runScannerAction, initialState)
  const [jobUrl, setJobUrl] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [selectedCvId, setSelectedCvId] = useState(cvVersions[0]?.id ?? '')
  const selectedCv = cvVersions.find(cv => cv.id === selectedCvId) ?? cvVersions[0]
  const isLinkedIn = isLinkedInJobUrl(jobUrl)

  return (
    <div className="grid gap-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">ATS Analyzer</p>
        <h2 className="mb-3 font-display text-4xl font-bold leading-tight text-white">
          Analyze a job<br />match
        </h2>
        <p className="text-sm leading-6 text-slate-400">
          Paste a job URL or job description, select your CV, and get your ATS match score with improvement suggestions.
        </p>
      </div>

      <form action={formAction} className="grid gap-5">
        <input type="hidden" name="cvVersionId" value={selectedCv?.id ?? ''} />

        {/* Job input */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Job offer URL
            </label>
          </div>

          {!pasteMode ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3">
                <span className="text-slate-500 text-sm">🔗</span>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-600"
                />
              </div>

              {isLinkedIn && (
                <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold text-amber-400">LinkedIn often blocks automated reading</p>
                  <p className="mt-0.5 text-xs text-amber-300/70">
                    For best results, copy the job description directly from the page and paste it below.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPasteMode(true)}
                    className="mt-1.5 text-xs font-medium text-amber-400 hover:underline"
                  >
                    Switch to paste mode →
                  </button>
                </div>
              )}

              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setPasteMode(true)}
                  className="rounded-full border border-[var(--accent)]/40 px-5 py-2 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
                >
                  OR paste job description text
                </button>
              </div>
            </>
          ) : (
            <div>
              <textarea
                name="jobDescription"
                className="min-h-48 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-4 text-sm text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
                placeholder="Paste the full job description here…"
                required
              />
              <button
                type="button"
                onClick={() => setPasteMode(false)}
                className="mt-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                ← Use URL instead
              </button>
            </div>
          )}
        </div>

        {/* CV section */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Your CV
          </label>
          {cvVersions.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
              No CV uploaded yet.{' '}
              <a href="/cv-enhancer" className="underline">
                Go to CV Enhancer
              </a>{' '}
              to upload and parse your CV first.
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="mb-2 text-xs font-semibold text-emerald-400">✓ Saved &amp; Ready!</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-lg text-slate-500">📄</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {selectedCv?.file_name ?? selectedCv?.name}
                    </p>
                    {selectedCv?.target_role && (
                      <p className="text-xs text-[var(--text-muted)]">{selectedCv.target_role}</p>
                    )}
                  </div>
                </div>
                {cvVersions.length > 1 && (
                  <select
                    value={selectedCvId}
                    onChange={e => setSelectedCvId(e.target.value)}
                    className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1.5 text-xs text-[var(--text-secondary)] outline-none"
                  >
                    {cvVersions.map(cv => (
                      <option key={cv.id} value={cv.id}>{cv.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">
                *Stored securely in your account*
              </p>
            </div>
          )}
        </div>

        {/* Language */}
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Language
          </label>
          <select
            name="language"
            defaultValue="en"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-1.5 text-xs text-[var(--text-secondary)] outline-none"
          >
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </div>

        {state.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {state.error}
          </div>
        )}
        {state.warning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
            Analysis completed, but save failed: {state.warning}
          </div>
        )}

        {cvVersions.length > 0 && (
          pasteMode ? (
            <SubmitButton />
          ) : (
            <button
              type="button"
              onClick={() => setPasteMode(true)}
              className="w-full rounded-xl bg-[var(--accent)] py-4 text-base font-semibold text-white transition hover:opacity-90"
            >
              Run ATS check →
            </button>
          )
        )}
        <p className="text-center text-[11px] text-[var(--text-muted)]">Processing takes ~15 seconds</p>
      </form>

      {/* Results */}
      {state.result && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--accent)]">ATS Result</p>
              <h3 className="font-display text-5xl font-bold text-[var(--text-primary)]">
                {state.result.overall_score}%
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{state.result.summary}</p>
          </div>
          <div className="mb-4 grid gap-2 md:grid-cols-5">
            {Object.entries(state.result.scores).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">{key}</p>
                <strong className="text-xl text-[var(--text-primary)]">{value}%</strong>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Matched keywords</h4>
              <div className="flex flex-wrap gap-2">
                {state.result.matched_keywords.slice(0, 12).map(item => (
                  <span key={item.keyword} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                    {item.keyword}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Missing keywords</h4>
              <div className="flex flex-wrap gap-2">
                {state.result.missing_keywords.slice(0, 12).map(item => (
                  <span key={item.keyword} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400">
                    {item.keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
