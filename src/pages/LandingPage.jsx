import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import LangSelector from '../components/LangSelector'
import ThemeToggle from '../components/ThemeToggle'
import AuthModal from '../components/AuthModal'

function Card({ children, style }) {
  return <div style={{ background: 'linear-gradient(180deg,var(--pro-card-strong),var(--pro-card-soft)),var(--bg-card)', border: '1px solid var(--pro-border)', borderRadius: 28, boxShadow: 'var(--shadow-sm)', ...style }}>{children}</div>
}

function Feature({ icon, title, text }) {
  return (
    <Card style={{ padding: 22 }}>
      <div style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 18, background: 'var(--accent-soft)', fontSize: 24, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: 19, letterSpacing: '-0.045em' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65 }}>{text}</p>
    </Card>
  )
}

function Step({ n, title, text }) {
  return (
    <div style={{ padding: 18, borderRadius: 22, background: 'var(--bg-input)', border: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 950, letterSpacing: '0.12em' }}>{n}</span>
      <h3 style={{ margin: '10px 0 6px', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: 18, letterSpacing: '-0.04em' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

function MiniResult() {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ width: 82, height: 82, borderRadius: 28, background: 'rgba(76,175,125,.12)', border: '1px solid rgba(76,175,125,.3)', display: 'grid', placeItems: 'center' }}>
          <strong style={{ color: '#4caf7d', fontFamily: 'Syne, sans-serif', fontSize: 24 }}>84%</strong>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 5px', color: 'var(--text-muted)', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Example result</p>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: 21, letterSpacing: '-.055em' }}>Strong ATS match</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>Missing: ITIL, Power BI, vendor management</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {['Add one quantified service delivery achievement', 'Mirror 3 missing keywords naturally', 'Prepare for 5 interview questions'].map(item => (
          <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 16, background: 'var(--bg-input)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', fontSize: 13 }}>
            <span style={{ color: 'var(--success)', fontWeight: 900 }}>✓</span>{item}
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function LandingPage() {
  const { t } = useLang()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const openAuth = mode => { setAuthMode(mode); setAuthOpen(true) }

  return (
    <div style={{ minHeight: '100dvh', color: 'var(--text-primary)', background: 'radial-gradient(circle at 18% 7%,rgba(96,165,250,.18),transparent 32%),radial-gradient(circle at 88% 13%,rgba(37,99,235,.12),transparent 30%),linear-gradient(180deg,var(--pro-bg-top) 0%,var(--pro-bg-mid) 48%,var(--pro-bg-bottom) 100%)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--border-soft)', background: 'var(--pro-nav)', backdropFilter: 'blur(18px)' }}>
        <div style={{ width: 'min(1180px, calc(100% - 32px))', height: 72, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--text-primary)', textDecoration: 'none' }}>
            <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 15, background: 'var(--accent)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif', fontWeight: 950, boxShadow: '0 10px 24px var(--accent-ring)' }}>J</span>
            <span><strong style={{ display: 'block', fontFamily: 'Syne, sans-serif', letterSpacing: '-.04em' }}>Joblytics</strong><small style={{ color: 'var(--text-muted)' }}>Career workspace</small></span>
          </a>
          <nav style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href="/pricing" style={topLink}>Pricing</a>
            <a href="/limits" style={topLink}>Limits</a>
            <LangSelector />
            <ThemeToggle />
            <button onClick={() => openAuth('signin')} style={ghostBtn}>{t('sign_in') || 'Sign in'}</button>
            <button onClick={() => openAuth('signup')} style={primaryBtn}>{t('get_started') || 'Get started'}</button>
          </nav>
        </div>
      </header>

      <main>
        <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: 'clamp(48px,8vw,98px) 0 52px', display: 'grid', gridTemplateColumns: 'minmax(0,1.08fr) minmax(320px,.92fr)', gap: 24, alignItems: 'center' }}>
          <div>
            <p style={kicker}>AI ATS checker · CV coach · job tracker</p>
            <h1 style={{ margin: '14px 0 0', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(54px,8vw,104px)', lineHeight: .88, letterSpacing: '-.09em' }}>Stop applying blind.</h1>
            <p style={{ maxWidth: 680, margin: '24px 0 0', color: 'var(--text-secondary)', fontSize: 'clamp(16px,2.2vw,19px)', lineHeight: 1.75 }}>
              Upload your CV, paste a job offer, and get a clear ATS match score with keyword gaps, quick CV fixes, cover letter help, salary intelligence, and interview preparation.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30 }}>
              <button onClick={() => openAuth('signup')} style={{ ...primaryBtn, minHeight: 52, padding: '0 22px' }}>Run a free ATS check →</button>
              <a href="/pricing" style={{ ...ghostBtn, minHeight: 52, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>View pricing</a>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
              {['Free start', 'EN / FR workflow', 'No CV resale', 'Paste mode for LinkedIn'].map(item => <span key={item} style={pill}>✓ {item}</span>)}
            </div>
          </div>
          <MiniResult />
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <p style={kicker}>How it works</p>
            <h2 style={sectionTitle}>From job offer to better application in minutes.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 14 }}>
            <Step n="01" title="Upload your CV" text="Store multiple CV versions for different roles, languages, and seniority levels." />
            <Step n="02" title="Paste the job" text="Use a URL or paste the description directly when job boards block automated reading." />
            <Step n="03" title="Improve before applying" text="Fix missing keywords, strengthen achievements, generate a letter, and prepare interviews." />
          </div>
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <p style={kicker}>Product</p>
            <h2 style={sectionTitle}>Everything a focused job search needs.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 14 }}>
            <Feature icon="🎯" title="ATS match score" text="See how your CV aligns with the role, including keyword and hard-requirement gaps." />
            <Feature icon="🧠" title="CV Coach" text="Turn vague CV bullets into quantified, recruiter-friendly achievements." />
            <Feature icon="✉️" title="Cover letters" text="Generate role-specific cover letters using the analysis and your strongest edges." />
            <Feature icon="💶" title="Salary intelligence" text="Understand ranges, leverage points, and negotiation angles before interview." />
            <Feature icon="📊" title="Application tracker" text="Save every analysis, track statuses, and compare roles over time." />
            <Feature icon="🛡️" title="Privacy-first" text="Built for job seekers. No recruiter marketplace. No CV resale." />
          </div>
        </section>

        <section style={sectionStyle}>
          <Card style={{ padding: 'clamp(24px,5vw,44px)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'center' }}>
            <div>
              <p style={kicker}>Pricing preview</p>
              <h2 style={sectionTitle}>Start free. Upgrade only when your search gets serious.</h2>
              <p style={{ margin: '14px 0 0', color: 'var(--text-secondary)', lineHeight: 1.7 }}>Free includes a useful monthly allowance. The future Job Search Pass is designed as a short, non-renewing sprint for active applications.</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <a href="/pricing" style={wideLink}>Pricing plans →</a>
              <a href="/limits" style={wideLink}>Usage limits →</a>
            </div>
          </Card>
        </section>

        <section style={{ ...sectionStyle, textAlign: 'center', paddingBottom: 100 }}>
          <p style={kicker}>Ready</p>
          <h2 style={{ ...sectionTitle, margin: '10px auto 0', maxWidth: 760 }}>Make every application sharper before you send it.</h2>
          <p style={{ margin: '16px auto 26px', maxWidth: 650, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Create your account, upload your CV, and run your first ATS check in less than one minute.</p>
          <button onClick={() => openAuth('signup')} style={{ ...primaryBtn, minHeight: 52, padding: '0 24px' }}>Get started free</button>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-soft)', padding: '32px 0 44px' }}>
        <div style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: 12 }}>
          <span>© {new Date().getFullYear()} Joblytics AI</span>
          <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="/privacy" style={footerLink}>Privacy</a>
            <a href="/terms" style={footerLink}>Terms</a>
            <a href="/contact" style={footerLink}>Contact</a>
          </span>
        </div>
      </footer>

      {authOpen && <AuthModal initialMode={authMode} onClose={() => setAuthOpen(false)} />}
    </div>
  )
}

const kicker = { margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.13em', textTransform: 'uppercase' }
const primaryBtn = { border: 0, borderRadius: 999, background: 'var(--accent)', color: 'var(--text-inverse)', padding: '0 18px', minHeight: 42, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 900, cursor: 'pointer', boxShadow: '0 16px 34px var(--accent-ring)' }
const ghostBtn = { border: '1px solid var(--border)', borderRadius: 999, background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '0 15px', minHeight: 42, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 850, cursor: 'pointer' }
const topLink = { color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, fontWeight: 800, padding: '10px 8px' }
const pill = { display: 'inline-flex', minHeight: 30, alignItems: 'center', padding: '0 11px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 800 }
const sectionStyle = { width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '44px 0' }
const sectionHeader = { marginBottom: 22 }
const sectionTitle = { margin: '10px 0 0', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px,5vw,56px)', lineHeight: .98, letterSpacing: '-.075em' }
const wideLink = { minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderRadius: 18, background: 'var(--bg-input)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 900 }
const footerLink = { color: 'var(--text-muted)', textDecoration: 'none' }
