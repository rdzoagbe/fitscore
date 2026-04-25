import React, { useState, useRef } from 'react'
import { useAnalyze } from './hooks/useAnalyze'
import ScoreRing from './components/ScoreRing'
import CategoryBars from './components/CategoryBars'
import KeywordTags from './components/KeywordTags'
import AdviceList from './components/AdviceList'

const LOADING_MSGS = [
  'Scanning job requirements...',
  'Matching your experience...',
  'Running ATS simulation...',
  'Calculating your score...'
]

export default function App() {
  const [job, setJob] = useState('')
  const [cv, setCv] = useState('')
  const [msgIdx, setMsgIdx] = useState(0)
  const intervalRef = useRef(null)
  const resultRef = useRef(null)
  const { status, data, error, analyze, reset } = useAnalyze()

  const handleAnalyze = async () => {
    if (!job.trim() || !cv.trim()) return
    intervalRef.current = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 1800)
    await analyze(job, cv)
    clearInterval(intervalRef.current)
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleReset = () => {
    reset()
    setJob('')
    setCv('')
    setMsgIdx(0)
  }

  const canAnalyze = job.trim().length > 30 && cv.trim().length > 30

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        padding: '20px 20px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f0f0' }}>
            Fit<span style={{ color: 'var(--accent)' }}>Score</span>
          </h1>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2, letterSpacing: '0.04em' }}>KNOW BEFORE YOU APPLY</p>
        </div>
        {status === 'done' && (
          <button onClick={handleReset} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '7px 16px', color: '#888', fontSize: 13, cursor: 'pointer'
          }}>New analysis</button>
        )}
      </header>

      <main style={{ padding: '24px 20px 40px', maxWidth: 480, margin: '0 auto' }}>

        {status !== 'done' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>

            {/* Intro */}
            {status === 'idle' && (
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.7 }}>
                Paste a job offer and your CV — we'll run an instant ATS check and tell you exactly how to improve your chances.
              </p>
            )}

            {/* Job input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Job offer
              </label>
              <textarea
                rows={6}
                value={job}
                onChange={e => setJob(e.target.value)}
                placeholder="Paste the full job description here — title, requirements, responsibilities..."
                disabled={status === 'loading'}
              />
            </div>

            {/* CV input */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Your CV
              </label>
              <textarea
                rows={7}
                value={cv}
                onChange={e => setCv(e.target.value)}
                placeholder="Paste your CV text here — experience, skills, education, certifications..."
                disabled={status === 'loading'}
              />
            </div>

            {/* Loading state */}
            {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '12px 0 24px', animation: 'fadeUp 0.3s ease' }}>
                <div style={{
                  width: 36, height: 36, border: '2px solid rgba(255,255,255,0.08)',
                  borderTop: '2px solid var(--accent)', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', margin: '0 auto 14px'
                }} />
                <p style={{ fontSize: 14, color: '#666', animation: 'pulse 1.8s ease infinite' }}>
                  {LOADING_MSGS[msgIdx]}
                </p>
              </div>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div style={{
                background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 16
              }}>
                <p style={{ fontSize: 13, color: '#ff7070', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {/* Analyze button */}
            {status !== 'loading' && (
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14,
                  background: canAnalyze ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  color: canAnalyze ? '#0f0f0f' : '#444',
                  border: 'none', fontFamily: 'var(--font-display)',
                  fontSize: 15, fontWeight: 700, cursor: canAnalyze ? 'pointer' : 'not-allowed',
                  letterSpacing: '-0.01em', transition: 'all 0.2s',
                  transform: canAnalyze ? 'none' : 'none'
                }}
              >
                Analyze my CV →
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {status === 'done' && data && (
          <div ref={resultRef} style={{ animation: 'fadeUp 0.5s ease' }}>

            {/* Score ring */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: '28px 20px', marginBottom: 14, textAlign: 'center'
            }}>
              <ScoreRing score={data.score} />
              {data.verdict && (
                <p style={{ fontSize: 14, color: '#888', marginTop: 14, lineHeight: 1.5, maxWidth: 280, margin: '14px auto 0' }}>
                  {data.verdict}
                </p>
              )}
            </div>

            {/* Score needed callout */}
            {data.score < 80 && (
              <div style={{
                background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <p style={{ fontSize: 13, color: '#f5a623', lineHeight: 1.5 }}>
                  You need <strong>80%+</strong> to pass most ATS filters. Follow the recommendations below to get there.
                </p>
              </div>
            )}

            {data.score >= 80 && (
              <div style={{
                background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.2)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <p style={{ fontSize: 13, color: '#4caf7d', lineHeight: 1.5 }}>
                  Strong match — you're ready to apply. Consider the tips below to push even higher.
                </p>
              </div>
            )}

            {/* Category bars */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Score breakdown</p>
              <CategoryBars categories={data.categories} />
            </div>

            {/* Keywords */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Keywords</p>
              <KeywordTags found={data.found_keywords} missing={data.missing_keywords} />
            </div>

            {/* Advice */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Recommendations</p>
              <AdviceList advice={data.advice} />
            </div>

            {/* New analysis */}
            <button onClick={handleReset} style={{
              width: '100%', padding: '15px', borderRadius: 14,
              background: 'var(--accent)', color: '#0f0f0f',
              border: 'none', fontFamily: 'var(--font-display)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em'
            }}>
              Analyze another CV →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
