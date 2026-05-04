import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import { generateOptimizedLinkedInDocx } from '../utils/linkedinDocx'
import { generateOptimizedLinkedInPdf } from '../utils/linkedinPdf'

export default function LinkedInOptimizerPage() {
  const { t, lang } = useLang()
  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [optimization, setOptimization] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState({})

  const optimize = async () => {
    setError('')
    setLoading(true)
    setOptimization(null)
    try {
      const res = await fetch('/api/linkedin-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, about, experience, skills, targetRole, lang })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
      setOptimization(data.optimization)
      // Scroll to results
      setTimeout(() => {
        document.getElementById('linkedin-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e) {
      setError(e.message || 'Could not analyze profile. Please try again.')
    }
    setLoading(false)
  }

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [key]: true }))
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000)
    } catch {}
  }

  const downloadDocx = async () => {
    try {
      await generateOptimizedLinkedInDocx(optimization, { fileName: 'LinkedIn-optimized.docx' })
    } catch (e) {
      setError('Could not generate DOCX. Please try again.')
    }
  }

  const downloadPdf = () => {
    try {
      generateOptimizedLinkedInPdf(optimization, { fileName: 'LinkedIn-optimized.pdf' })
    } catch (e) {
      setError('Could not generate PDF. Please try again.')
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,4vw,32px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          🔗 {t('linkedin_kicker') || 'LinkedIn Optimizer'}
        </p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(22px,5vw,32px)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {t('linkedin_title') || 'Make your LinkedIn profile recruiter-magnet'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('linkedin_subtitle') || 'Paste your profile sections below. Get a section-by-section analysis with copy-paste-ready improvements.'}
        </p>
      </div>

      {/* How-to */}
      <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          💡 <strong>{t('linkedin_howto_title') || 'How to copy your LinkedIn sections:'}</strong> {t('linkedin_howto_body') || "Open your LinkedIn profile → click on each section → select all text (Ctrl+A) → copy (Ctrl+C) → paste below. Don't worry if you only fill some — even just Headline and About gives a useful analysis."}
        </p>
      </div>

      {/* Input form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(16px,3vw,24px)', marginBottom: 24 }}>
        {/* Target role (optional, top) */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            🎯 {t('linkedin_target_role') || 'Target role'} <span style={{ textTransform: 'none', color: 'var(--text-hint)', fontWeight: 400 }}>· {t('optional') || 'optional'}</span>
          </label>
          <input
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            placeholder={t('linkedin_target_placeholder') || 'e.g. Senior Product Manager · Cloud Infrastructure Lead · Engineering Manager'}
            style={{ fontSize: 14 }}
          />
          <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4 }}>
            {t('linkedin_target_hint') || 'What roles do you want to be found for? Helps tune the optimization.'}
          </p>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            {t('linkedin_section_headline') || 'Headline'} <span style={{ color: 'var(--text-hint)', fontWeight: 400 }}>· {headline.length}/220</span>
          </label>
          <input
            value={headline}
            onChange={e => setHeadline(e.target.value.slice(0, 220))}
            placeholder={t('linkedin_headline_placeholder') || 'e.g. Senior IT Manager · ERP & CRM · Available for new opportunities'}
            style={{ fontSize: 14 }}
          />
        </div>

        {/* About */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            {t('linkedin_section_about') || 'About / Summary'} <span style={{ color: 'var(--text-hint)', fontWeight: 400 }}>· {about.length} chars</span>
          </label>
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            placeholder={t('linkedin_about_placeholder') || 'Paste your LinkedIn About section here. The more you paste, the better the analysis.'}
            rows={6}
            maxLength={3000}
            style={{ fontSize: 13, resize: 'vertical' }}
          />
        </div>

        {/* Experience */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            {t('linkedin_section_experience') || 'Experience'} <span style={{ color: 'var(--text-hint)', fontWeight: 400 }}>· {t('optional') || 'optional'}</span>
          </label>
          <textarea
            value={experience}
            onChange={e => setExperience(e.target.value)}
            placeholder={t('linkedin_experience_placeholder') || 'Paste your most recent 1-3 experience entries (title + company + bullets).'}
            rows={6}
            maxLength={4000}
            style={{ fontSize: 13, resize: 'vertical' }}
          />
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            {t('linkedin_section_skills') || 'Skills'} <span style={{ color: 'var(--text-hint)', fontWeight: 400 }}>· {t('optional') || 'optional'}</span>
          </label>
          <input
            value={skills}
            onChange={e => setSkills(e.target.value)}
            placeholder={t('linkedin_skills_placeholder') || 'Comma-separated: Project Management, ITIL, Salesforce, Team Leadership...'}
            style={{ fontSize: 13 }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 14, padding: '10px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10 }}>
            ⚠ {error}
          </p>
        )}

        <button onClick={optimize} disabled={loading || (!headline.trim() && !about.trim())} className="btn-primary" style={{ width: '100%' }}>
          {loading ? `⏳ ${t('linkedin_loading') || 'Analyzing your profile...'}` : `✨ ${t('linkedin_cta') || 'Optimize my profile →'}`}
        </button>

        {!headline.trim() && !about.trim() && (
          <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 8 }}>
            {t('linkedin_min_warning') || 'Fill at least Headline OR About to start.'}
          </p>
        )}
      </div>

      {/* Results */}
      {optimization && (
        <div id="linkedin-results" style={{ animation: 'fadeUp 0.4s ease' }}>
          <OverallScoreCard data={optimization} t={t} />
          <SectionCard
            title={t('linkedin_section_headline') || 'Headline'}
            icon="📌"
            section={optimization.headline}
            improvedKey="improved_version"
            copyKey="headline"
            copied={copied.headline}
            onCopy={() => copyToClipboard(optimization.headline.improved_version, 'headline')}
            t={t}
          />
          <SectionCard
            title={t('linkedin_section_about') || 'About / Summary'}
            icon="💬"
            section={optimization.about}
            improvedKey="improved_version"
            copyKey="about"
            copied={copied.about}
            onCopy={() => copyToClipboard(optimization.about.improved_version, 'about')}
            preserveLines
            t={t}
          />
          {optimization.experience?.improvements?.length > 0 && (
            <ExperienceCard data={optimization.experience} copied={copied} onCopy={copyToClipboard} t={t} />
          )}
          {optimization.skills && (
            <SkillsCard data={optimization.skills} t={t} />
          )}
          {optimization.quick_wins?.length > 0 && (
            <QuickWinsCard wins={optimization.quick_wins} t={t} />
          )}

          {/* Download buttons */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(16px,3vw,24px)', marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>
              ⬇️ {t('linkedin_download_title') || 'Download your optimized profile'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              {t('linkedin_download_desc') || 'Get the full analysis as a document you can keep, edit, or share.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8 }}>
              <button onClick={downloadDocx} className="btn-primary">
                ⬇ {t('download_docx') || 'Download .docx'}
              </button>
              <button onClick={downloadPdf} style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⬇ {t('download_pdf') || 'Download .pdf'}
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 30 }}>
            ℹ️ {optimization.honest_disclaimer || (t('linkedin_disclaimer') || 'Review carefully before publishing on LinkedIn. AI optimizes wording but does not verify facts.')}
          </p>
        </div>
      )}
    </main>
  )
}

function OverallScoreCard({ data, t }) {
  const score = data.overall_score || 0
  const projectedScore = Math.min(100, score + 25)
  const color = score >= 70 ? '#4caf7d' : score >= 50 ? '#f5a623' : '#ff6b6b'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(18px,3.5vw,24px)', marginBottom: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>
        📊 {t('linkedin_overall_score') || 'Overall profile score'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t('linkedin_now') || 'Now'}</p>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>
            {score}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span>
          </p>
        </div>
        <div style={{ fontSize: 22, color: 'var(--text-muted)' }}>→</div>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{t('linkedin_after') || 'After improvements'}</p>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 700, color: '#4caf7d', lineHeight: 1 }}>
            {projectedScore}<span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span>
          </p>
        </div>
      </div>
      {data.score_explanation && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 14 }}>
          {data.score_explanation}
        </p>
      )}
    </div>
  )
}

function SectionCard({ title, icon, section, improvedKey, copyKey, copied, onCopy, preserveLines, t }) {
  if (!section || !section[improvedKey]) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(16px,3vw,24px)', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
          {icon} {title}
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>{section.current_score}/10</span>
          <span style={{ color: 'var(--accent)' }}>→</span>
          <span style={{ color: '#4caf7d', fontWeight: 700 }}>{section.improved_score}/10</span>
        </div>
      </div>

      {section.issues?.length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(255,142,107,0.06)', border: '1px solid rgba(255,142,107,0.2)', borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#ff8e6b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            {t('linkedin_issues') || 'Issues'}
          </p>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {section.issues.map((issue, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 2 }}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ fontSize: 10, fontWeight: 700, color: '#4caf7d', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
        ✨ {t('linkedin_improved') || 'Improved version'} — {t('copy_paste_ready') || 'copy-paste ready'}
      </p>
      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, position: 'relative' }}>
        <p style={{
          fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7,
          whiteSpace: preserveLines ? 'pre-wrap' : 'normal',
          wordBreak: 'break-word'
        }}>
          {section[improvedKey]}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onCopy} style={{
          padding: '8px 14px', borderRadius: 20,
          background: copied ? 'rgba(76,175,125,0.15)' : 'var(--accent)',
          border: copied ? '1px solid rgba(76,175,125,0.3)' : 'none',
          color: copied ? '#4caf7d' : '#1A1B22',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif'
        }}>
          {copied ? `✓ ${t('copied') || 'Copied'}` : `📋 ${t('copy') || 'Copy'}`}
        </button>
        {section.why_better && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', flex: 1, minWidth: 200 }}>
            {section.why_better}
          </p>
        )}
      </div>
    </div>
  )
}

function ExperienceCard({ data, copied, onCopy, t }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(16px,3vw,24px)', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
          💼 {t('linkedin_section_experience') || 'Experience'}
        </p>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.current_score}/10</span>
      </div>

      {data.issues?.length > 0 && (
        <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(255,142,107,0.06)', border: '1px solid rgba(255,142,107,0.2)', borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#ff8e6b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            {t('linkedin_issues') || 'Issues'}
          </p>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {data.issues.map((issue, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {data.improvements.map((imp, idx) => {
        const allBullets = (imp.improved_bullets || []).join('\n• ')
        return (
          <div key={idx} style={{ marginBottom: 14, padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>{imp.role_title}</p>
            <ul style={{ paddingLeft: 16, margin: 0, marginBottom: 10 }}>
              {(imp.improved_bullets || []).map((b, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 4 }}>{b}</li>
              ))}
            </ul>
            <button
              onClick={() => onCopy(`• ${allBullets}`, `exp${idx}`)}
              style={{
                padding: '6px 12px', borderRadius: 16,
                background: copied[`exp${idx}`] ? 'rgba(76,175,125,0.15)' : 'var(--accent)',
                border: copied[`exp${idx}`] ? '1px solid rgba(76,175,125,0.3)' : 'none',
                color: copied[`exp${idx}`] ? '#4caf7d' : '#1A1B22',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif'
              }}
            >
              {copied[`exp${idx}`] ? `✓ ${t('copied') || 'Copied'}` : `📋 ${t('copy_bullets') || 'Copy bullets'}`}
            </button>
          </div>
        )
      })}

      {data.general_advice && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          💡 {data.general_advice}
        </p>
      )}
    </div>
  )
}

function SkillsCard({ data, t }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 'clamp(16px,3vw,24px)', marginBottom: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>
        🛠 {t('linkedin_section_skills') || 'Skills'}
      </p>
      {data.to_reorder_top_3?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            ⭐ {t('linkedin_pin_top3') || 'Pin these as top 3'}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.to_reorder_top_3.map((s, i) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: 14, background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {data.to_add?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#4caf7d', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            ➕ {t('linkedin_add_skills') || 'Add'}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.to_add.map((s, i) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: 14, background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.3)', color: '#4caf7d', fontSize: 12, fontWeight: 500 }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {data.to_remove?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#ff8e6b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
            ➖ {t('linkedin_remove_skills') || 'Remove'}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.to_remove.map((s, i) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: 14, background: 'rgba(255,142,107,0.08)', border: '1px solid rgba(255,142,107,0.25)', color: '#ff8e6b', fontSize: 12, textDecoration: 'line-through' }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      {data.rationale && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 8, lineHeight: 1.6 }}>
          💡 {data.rationale}
        </p>
      )}
    </div>
  )
}

function QuickWinsCard({ wins, t }) {
  return (
    <div style={{ background: 'rgba(76,175,125,0.06)', border: '1px solid rgba(76,175,125,0.25)', borderRadius: 18, padding: 'clamp(16px,3vw,24px)', marginBottom: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#4caf7d', fontFamily: 'Syne, sans-serif', marginBottom: 10 }}>
        ⚡ {t('linkedin_quick_wins') || 'Quick wins (do these now)'}
      </p>
      <ul style={{ paddingLeft: 18, margin: 0 }}>
        {wins.map((w, i) => (
          <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 4 }}>{w}</li>
        ))}
      </ul>
    </div>
  )
}
