import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import LangSelector from '../components/LangSelector'
import ThemeToggle from '../components/ThemeToggle'
import AuthModal from '../components/AuthModal'
import ContactModal from '../components/ContactModal'

const palette = {
  ivory: '#FAF7F1',
  paper: '#FFFDF8',
  navy: '#10182B',
  muted: '#5F6472',
  line: 'rgba(16,24,43,0.12)',
  copper: '#B5663C',
  copperSoft: 'rgba(181,102,60,0.10)',
  green: '#557C64'
}

function JbLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: 48, height: 48, borderRadius: '50%', border: `1.4px solid ${palette.navy}`, display: 'grid', placeItems: 'center', background: palette.ivory }}>
        <span style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 300, fontSize: 23, color: palette.navy, letterSpacing: '-0.08em', transform: 'translateY(1px)' }}>Jb</span>
        <span style={{ position: 'absolute', right: -2, top: 4, width: 10, height: 10, borderRadius: 999, background: palette.copper }} />
      </div>
      <div>
        <strong style={{ display: 'block', fontFamily: 'Georgia, serif', fontSize: 19, color: palette.navy, letterSpacing: '-0.04em' }}>Joblytics</strong>
        <span style={{ display: 'block', fontSize: 11, color: palette.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Career workspace</span>
      </div>
    </div>
  )
}

function SectionCard({ number, title, text, icon }) {
  return (
    <article style={{ background: palette.paper, border: `1px solid ${palette.line}`, borderRadius: 28, padding: 26, minHeight: 230, boxShadow: '0 18px 40px rgba(16,24,43,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 34 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: palette.copper, letterSpacing: '0.12em' }}>{number}</span>
        <span style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: '50%', background: palette.copperSoft, fontSize: 22 }}>{icon}</span>
      </div>
      <h3 style={{ margin: '0 0 10px', color: palette.navy, fontFamily: 'Georgia, serif', fontSize: 25, lineHeight: 1.05, letterSpacing: '-0.04em' }}>{title}</h3>
      <p style={{ margin: 0, color: palette.muted, lineHeight: 1.65, fontSize: 14 }}>{text}</p>
    </article>
  )
}

function SampleAnalysisCard() {
  return (
    <div id="sample-analysis" style={{ background: palette.paper, border: `1px solid ${palette.line}`, borderRadius: 34, padding: 20, boxShadow: '0 28px 80px rgba(16,24,43,0.10)' }}>
      <div style={{ border: `1px solid ${palette.line}`, borderRadius: 26, overflow: 'hidden', background: '#fff' }}>
        <div style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', borderBottom: `1px solid ${palette.line}`, background: '#FAF7F1' }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#D8CABC' }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#D8CABC' }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#D8CABC' }} />
          <span style={{ marginLeft: 10, fontSize: 11, color: palette.muted }}>joblytics-ai.com/sample-analysis</span>
        </div>
        <div style={{ padding: 22 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: palette.copper, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sample analysis</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
            <div style={{ width: 92, height: 92, borderRadius: '50%', border: `2px solid ${palette.green}`, display: 'grid', placeItems: 'center', background: 'rgba(85,124,100,0.10)', flexShrink: 0 }}>
              <strong style={{ fontSize: 24, fontFamily: 'Georgia, serif', color: palette.green }}>84%</strong>
            </div>
            <div>
              <h3 style={{ margin: 0, color: palette.navy, fontFamily: 'Georgia, serif', fontSize: 28, lineHeight: 1.05, letterSpacing: '-0.05em' }}>Strong match</h3>
              <p style={{ margin: '7px 0 0', color: palette.muted, fontSize: 14, lineHeight: 1.55 }}>Likely to pass ATS. Add 2 missing keywords and strengthen one achievement.</p>
            </div>
          </div>
          {['ATS keywords detected', 'CV coach quick wins ready', 'Interview questions generated'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 14, background: '#FAF7F1', border: `1px solid ${palette.line}`, marginTop: 10, color: palette.navy, fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: palette.green }}>✓</span>{item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { t } = useLang()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const [contactOpen, setContactOpen] = useState(false)

  const openAuth = mode => {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  const sections = [
    { number: '01', icon: '🎯', title: 'ATS check', text: 'Compare your CV against a real job description and understand whether the application is worth sending.' },
    { number: '02', icon: '✍️', title: 'CV coach', text: 'Turn generic CV lines into sharper, quantified, recruiter-friendly achievements.' },
    { number: '03', icon: '✉️', title: 'Cover letter', text: 'Generate a tailored draft that reflects the role, your strengths, and the company context.' },
    { number: '04', icon: '📋', title: 'Job tracker', text: 'Keep your applications, statuses, follow-ups, recruiters, and notes in one clear workspace.' },
    { number: '05', icon: '🎤', title: 'Interview prep', text: 'Prepare realistic questions based on your CV gaps, strengths, and the role requirements.' },
    { number: '06', icon: '🛡️', title: 'Trust & privacy', text: 'Built for job seekers. Your CV is used to help you apply better — not to resell your profile.' }
  ]

  return (
    <div style={{ minHeight: '100dvh', background: palette.ivory, color: palette.navy, fontFamily: '-apple-system, BlinkMacSystemFont, "DM Sans", Inter, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(250,247,241,0.88)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${palette.line}` }}>
        <nav style={{ width: 'min(1180px, calc(100% - 32px))', minHeight: 76, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
          <JbLogo />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <LangSelector />
            <ThemeToggle />
            <button onClick={() => openAuth('signin')} style={{ border: `1px solid ${palette.line}`, borderRadius: 999, background: 'rgba(255,255,255,0.55)', color: palette.navy, minHeight: 40, padding: '0 16px', fontWeight: 800, cursor: 'pointer' }}>{t('sign_in') || 'Sign in'}</button>
            <button onClick={() => openAuth('signup')} style={{ border: 0, borderRadius: 999, background: palette.navy, color: palette.ivory, minHeight: 40, padding: '0 18px', fontWeight: 850, cursor: 'pointer' }}>{t('get_started') || 'Get started'}</button>
          </div>
        </nav>
      </header>

      <main>
        <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: 'clamp(60px, 9vw, 110px) 0 clamp(46px, 7vw, 80px)', display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(320px,.95fr)', gap: 34, alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, color: palette.copper, fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Career growth workspace</p>
            <h1 style={{ margin: '14px 0 0', color: palette.navy, fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(58px, 9vw, 112px)', lineHeight: 0.86, letterSpacing: '-0.085em', fontWeight: 400 }}>Joblytics</h1>
            <p style={{ margin: '26px 0 0', maxWidth: 620, color: palette.muted, fontSize: 'clamp(18px, 2.4vw, 22px)', lineHeight: 1.6 }}>
              Check your CV against a job before you apply.
            </p>
            <p style={{ margin: '14px 0 0', maxWidth: 620, color: palette.muted, fontSize: 15, lineHeight: 1.75 }}>
              Get an ATS check, improve your CV, draft a cover letter, track applications, and prepare for interviews from one calm workspace.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 32 }}>
              <button onClick={() => openAuth('signup')} style={{ minHeight: 50, padding: '0 24px', borderRadius: 999, border: 0, background: palette.navy, color: palette.ivory, fontWeight: 900, cursor: 'pointer', boxShadow: '0 18px 38px rgba(16,24,43,0.18)' }}>Start free</button>
              <a href="#sample-analysis" style={{ minHeight: 50, padding: '0 22px', borderRadius: 999, border: `1px solid ${palette.line}`, color: palette.navy, background: 'rgba(255,255,255,0.55)', fontWeight: 900, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>See sample analysis</a>
            </div>
          </div>
          <SampleAnalysisCard />
        </section>

        <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '34px 0 70px' }}>
          <div style={{ maxWidth: 760, marginBottom: 26 }}>
            <p style={{ margin: 0, color: palette.copper, fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>What it helps you do</p>
            <h2 style={{ margin: '10px 0 0', color: palette.navy, fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(36px, 6vw, 66px)', lineHeight: 0.95, letterSpacing: '-0.065em', fontWeight: 400 }}>A better application workflow.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            {sections.map(item => <SectionCard key={item.number} {...item} />)}
          </div>
        </section>

        <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '0 0 80px' }}>
          <div style={{ background: palette.navy, color: palette.ivory, borderRadius: 34, padding: 'clamp(28px, 5vw, 52px)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#D6A181', fontSize: 12, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Trust first</p>
              <h2 style={{ margin: '10px 0 12px', fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(34px,5vw,58px)', lineHeight: 1, letterSpacing: '-0.06em', fontWeight: 400 }}>Built for job seekers.</h2>
              <p style={{ margin: 0, color: 'rgba(250,247,241,0.72)', lineHeight: 1.7, fontSize: 15 }}>Joblytics is designed to help you improve your own applications. It is not a recruiter database, and the goal is not to sell your CV.</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {['No CV resale', 'Transparent application guidance', 'AI output you review before use'].map(item => (
                <div key={item} style={{ border: '1px solid rgba(250,247,241,0.16)', borderRadius: 16, padding: '12px 14px', color: palette.ivory, background: 'rgba(250,247,241,0.06)', fontSize: 13, fontWeight: 800 }}>✓ {item}</div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${palette.line}`, padding: '30px 0 42px' }}>
        <div style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ color: palette.muted, fontSize: 12 }}>© {new Date().getFullYear()} Joblytics. Career growth workspace.</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href="/privacy" style={{ color: palette.muted, textDecoration: 'none', fontSize: 13, fontWeight: 750 }}>Privacy</a>
            <a href="/terms" style={{ color: palette.muted, textDecoration: 'none', fontSize: 13, fontWeight: 750 }}>Terms</a>
            <button onClick={() => setContactOpen(true)} style={{ color: palette.muted, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 750 }}>Contact</button>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 920px) {
          main section:first-of-type { grid-template-columns: 1fr !important; }
          main section:nth-of-type(2) > div:last-child { grid-template-columns: 1fr 1fr !important; }
          main section:nth-of-type(3) > div { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          header nav { align-items: flex-start !important; min-height: auto !important; padding: 12px 0 !important; }
          header nav > div:last-child { width: 100%; justify-content: flex-start !important; }
          main section:nth-of-type(2) > div:last-child { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {authOpen && <AuthModal initialMode={authMode} onClose={() => setAuthOpen(false)} />}
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </div>
  )
}
