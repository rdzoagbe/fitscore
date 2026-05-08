import React, { useState } from 'react'
import { useLang } from '../context/LangContext'

const steps = [
  {
    icon: '📄',
    kicker: 'Step 1',
    title: 'Add your CV',
    desc: 'Upload the CV you want to use most often. You can keep separate versions for English, French, IT Manager, Service Delivery, and more.',
    bullets: ['PDF or Word supported', 'Multiple CVs available', 'Switch CV before each analysis']
  },
  {
    icon: '🔎',
    kicker: 'Step 2',
    title: 'Analyze a job offer',
    desc: 'Paste a job URL or the full job description. Paste mode is best for LinkedIn and job boards that block automatic reading.',
    bullets: ['ATS-style scoring', 'Keyword gap detection', 'Seniority and salary insights']
  },
  {
    icon: '🎯',
    kicker: 'Step 3',
    title: 'Improve before applying',
    desc: 'Use the quick wins to strengthen your CV before sending it. Then generate a tailored cover letter and prepare for interview questions.',
    bullets: ['Quick CV improvements', 'Cover letter generator', 'Interview prep']
  },
  {
    icon: '📊',
    kicker: 'Step 4',
    title: 'Track your applications',
    desc: 'Every analysis is saved in your History board so you can compare roles, monitor progress, and update application status.',
    bullets: ['Saved analyses', 'Application statuses', 'Progress over time']
  }
]

export default function Onboarding({ onDone }) {
  const { t } = useLang()
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(14px)' }}>
      <section style={{ width: 'min(940px, 100%)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 0, overflow: 'hidden', borderRadius: 34, border: '1px solid var(--pro-border)', background: 'linear-gradient(180deg, var(--pro-card-strong), var(--pro-card-soft)), var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: 'clamp(28px, 5vw, 52px)' }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '0.13em', textTransform: 'uppercase' }}>{current.kicker}</p>
          <div style={{ fontSize: 58, margin: '18px 0 14px' }}>{current.icon}</div>
          <h2 style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontSize: 'clamp(34px, 5vw, 64px)', lineHeight: 0.95, letterSpacing: '-0.075em', color: 'var(--text-primary)' }}>{current.title}</h2>
          <p style={{ margin: '18px 0 0', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.75, maxWidth: 620 }}>{current.desc}</p>

          <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
            {current.bullets.map(item => (
              <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 16, background: 'var(--bg-input)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--success-soft)', color: 'var(--success)' }}>✓</span>
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 32 }}>
            {steps.map((_, i) => <button key={i} aria-label={`Go to onboarding step ${i + 1}`} onClick={() => setStep(i)} style={{ width: i === step ? 34 : 8, height: 8, borderRadius: 999, border: 0, background: i === step ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', transition: 'all .2s ease' }} />)}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onDone()} style={{ flex: 1, minHeight: 48, borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 850, cursor: 'pointer' }}>
              {step > 0 ? (t('onb_back') || 'Back') : (t('onb_skip') || 'Skip')}
            </button>
            <button onClick={() => isLast ? onDone() : setStep(s => s + 1)} style={{ flex: 1.5, minHeight: 48, borderRadius: 999, border: 0, background: 'var(--accent)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif', fontWeight: 900, cursor: 'pointer', boxShadow: '0 16px 34px var(--accent-ring)' }}>
              {isLast ? (t('onb_get_started') || 'Start using Joblytics') : (t('onb_next') || 'Next')}
            </button>
          </div>
        </div>

        <aside style={{ padding: 24, background: 'linear-gradient(160deg, var(--accent-soft), var(--pro-card-soft) 52%, var(--pro-card)), var(--bg-card)', borderLeft: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 76, height: 76, display: 'grid', placeItems: 'center', borderRadius: 26, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 32 }}>✦</div>
            <h3 style={{ margin: '24px 0 8px', fontFamily: 'Syne, sans-serif', fontSize: 30, lineHeight: 1.05, letterSpacing: '-0.06em', color: 'var(--text-primary)' }}>Your career workspace</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65 }}>Joblytics is built to help you apply smarter, not just faster.</p>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
            {['Analyze', 'Improve', 'Track', 'Prepare'].map((item, i) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 850 }}>{item}</span>
                <em style={{ color: i <= step ? 'var(--accent)' : 'var(--text-hint)', fontStyle: 'normal', fontWeight: 900 }}>0{i + 1}</em>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <style>{`@media(max-width:760px){section[style*="grid-template-columns: minmax(0, 1fr) 340px"]{grid-template-columns:1fr!important} section[style*="grid-template-columns: minmax(0, 1fr) 340px"] aside{display:none!important}}`}</style>
    </div>
  )
}
