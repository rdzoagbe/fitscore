import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import { useCvPersist } from '../hooks/useCvPersist'
import { generateOptimizedCvDocx } from '../utils/cvDocx'

export default function OptimizeCvCard({ selected }) {
  const { t, lang } = useLang()
  const { cvFile } = useCvPersist()
  const [optimized, setOptimized] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const optimize = async () => {
    if (!selected?.result) return
    if (!cvFile) {
      setError(t('cv_optimize_no_cv') || 'Upload a CV in the analyzer first.')
      return
    }
    setLoading(true)
    setError('')
    setOptimized(null)
    try {
      // Read CV file as base64
      const cvBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = () => reject(new Error('Could not read CV file'))
        reader.readAsDataURL(cvFile)
      })

      const res = await fetch('/api/cv-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvBase64,
          cvMimeType: cvFile.type,
          analysis: selected.result,
          lang
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
      if (!data.optimized) throw new Error('No optimized CV returned')

      setOptimized(data.optimized)
    } catch (e) {
      setError(e.message || 'Could not optimize CV. Please try again.')
    }
    setLoading(false)
  }

  const download = async () => {
    if (!optimized) return
    setDownloading(true)
    try {
      const jobTitle = selected?.result?.job_context?.title?.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 30) || 'optimized'
      const fileName = `CV-${optimized.header?.full_name?.replace(/\s+/g, '-') || 'me'}-${jobTitle}.docx`
      await generateOptimizedCvDocx(optimized, { fileName })
    } catch (e) {
      setError(e.message || 'Could not generate file. Please try again.')
    }
    setDownloading(false)
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', marginTop: 20 }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: 2 }}>
          📝 {t('cv_optimize_title') || 'Optimize my CV'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {t('cv_optimize_desc') || 'AI-rewritten draft tailored to this job. Download as Word document.'}
        </p>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {!optimized && !loading && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
              ℹ️ {t('cv_optimize_note') || 'We rewrite your existing CV using more impactful language and emphasize keywords from this job. We never invent skills or experience.'}
            </p>

            {error && (
              <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 10, padding: '9px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10 }}>
                ⚠ {error}
              </p>
            )}

            <button onClick={optimize} disabled={!selected || !cvFile} className="btn-primary" style={{ width: '100%' }}>
              ✨ {t('cv_optimize_cta') || 'Optimize my CV →'}
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('cv_optimize_loading') || 'Rewriting your CV for this role...'}
            </p>
          </div>
        )}

        {optimized && (
          <div>
            {/* What changed */}
            {optimized.changes_made?.length > 0 && (
              <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(76,175,125,0.06)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#4caf7d', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                  ✨ {t('cv_optimize_changes') || 'What changed'}
                </p>
                <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 16, margin: 0 }}>
                  {optimized.changes_made.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview — collapsed sections */}
            <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, maxHeight: 360, overflowY: 'auto' }}>
              {optimized.header?.full_name && (
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, textAlign: 'center' }}>
                  {optimized.header.full_name}
                </p>
              )}
              {optimized.header?.title && (
                <p style={{ fontSize: 13, color: 'var(--accent)', textAlign: 'center', marginBottom: 12 }}>
                  {optimized.header.title}
                </p>
              )}

              {optimized.summary && (
                <>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                    {t('cv_section_profile') || 'Profile'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                    {optimized.summary}
                  </p>
                </>
              )}

              {optimized.experience?.length > 0 && (
                <>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, marginTop: 10, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                    {t('cv_section_experience') || 'Experience'} ({optimized.experience.length})
                  </p>
                  {optimized.experience.slice(0, 2).map((exp, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {exp.title} {exp.company ? `@ ${exp.company}` : ''}
                      </p>
                      {exp.dates && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4 }}>{exp.dates}</p>}
                      {exp.bullets?.[0] && <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>• {exp.bullets[0]}</p>}
                    </div>
                  ))}
                  {optimized.experience.length > 2 && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>
                      + {optimized.experience.length - 2} {t('more_in_doc') || 'more in the document'}
                    </p>
                  )}
                </>
              )}
            </div>

            <p style={{ fontSize: 10, color: 'var(--text-hint)', lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic', textAlign: 'center' }}>
              ℹ️ {optimized.honest_disclaimer || (t('cv_optimize_disclaimer') || 'Review carefully and edit before sending. AI does not verify facts.')}
            </p>

            {error && (
              <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 10 }}>⚠ {error}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={download} disabled={downloading} className="btn-primary" style={{ width: '100%' }}>
                {downloading ? '⏳ ...' : `⬇ ${t('download_docx') || 'Download .docx'}`}
              </button>
              <button onClick={optimize} disabled={loading} style={{ padding: '10px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                ↺ {t('regenerate') || 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
