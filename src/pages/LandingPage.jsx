import React, { useMemo, useState } from 'react'
import { useLang } from '../context/LangContext'
import LangSelector from '../components/LangSelector'
import ThemeToggle from '../components/ThemeToggle'
import AuthModal from '../components/AuthModal'
import './LandingPage.css'

function ConversionNav({ openAuth, t }) {
  return (
    <header className="landing-nav-shell">
      <div className="landing-nav">
        <a href="/" className="landing-brand" aria-label="Joblytics AI home">
          <span className="landing-brand-mark">J</span>
          <span>
            <strong>Joblytics AI</strong>
            <small>Career workspace</small>
          </span>
        </a>

        <nav className="landing-nav-links" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#trust">Privacy</a>
          <a href="/pricing">Pricing</a>
          <LangSelector />
          <ThemeToggle />
          <button className="landing-btn landing-btn-ghost" onClick={() => openAuth('signin')}>{t('sign_in') || 'Sign in'}</button>
          <button className="landing-btn landing-btn-primary" onClick={() => openAuth('signup')}>{t('get_started') || 'Get started'}</button>
        </nav>
      </div>
    </header>
  )
}

function HeroPreview() {
  const improvements = ['Add measurable proof to the top CV bullets', "Mirror the role's strongest ATS keywords", 'Prepare answers for the gaps recruiters may test']
  return (
    <div className="hero-preview-card" aria-label="Product preview">
      <div className="preview-topline">
        <span className="preview-dot" />
        <span>Live application readiness</span>
      </div>

      <div className="score-row">
        <div className="score-ring">
          <strong>84%</strong>
          <span>Application readiness</span>
        </div>
        <div>
          <p className="micro-label">Recommendation</p>
          <h3>Strong fit — improve before sending</h3>
          <p>Your experience is relevant. Joblytics shows the precise wording and proof points to strengthen before applying.</p>
        </div>
      </div>

      <div className="preview-meters">
        <div><span>Leadership keywords</span><strong>92%</strong><i style={{ width: '92%' }} /></div>
        <div><span>Technical fit</span><strong>81%</strong><i style={{ width: '81%' }} /></div>
        <div><span>Role evidence</span><strong>68%</strong><i style={{ width: '68%' }} /></div>
      </div>

      <div className="preview-checklist">
        {improvements.map(item => <span key={item}>✓ {item}</span>)}
      </div>
    </div>
  )
}

function StatStrip() {
  return (
    <section className="landing-stat-strip" aria-label="Product outcomes">
      <div><strong>1</strong><span>connected career workspace</span></div>
      <div><strong>7</strong><span>workflow steps from CV to interview</span></div>
      <div><strong>EN / FR</strong><span>built for international job search</span></div>
      <div><strong>0</strong><span>LinkedIn login or scraping required</span></div>
    </section>
  )
}

function WorkflowStep({ number, title, text, cta, href, onClick }) {
  const handleClick = event => {
    if (!onClick) return
    event.preventDefault()
    onClick()
  }

  return (
    <article className="workflow-step">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {cta && <a href={href || '#signup'} onClick={handleClick}>{cta} →</a>}
    </article>
  )
}

function FeatureCard({ icon, title, text }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function BeforeAfter() {
  return (
    <section className="landing-section landing-split-section">
      <div>
        <p className="landing-kicker">Before / after</p>
        <h2>Turn a generic CV into a role-specific application plan.</h2>
        <p className="section-lead">Joblytics turns the job description into a practical action plan: what to rewrite, what to mention, what to track, and what to prepare for the interview.</p>
      </div>
      <div className="before-after-grid">
        <div className="before-card">
          <span>Before</span>
          <p>“Managed IT support and worked with vendors.”</p>
          <small>Too generic. Hard for an ATS or recruiter to understand scope.</small>
        </div>
        <div className="after-card">
          <span>After</span>
          <p>“Led multi-site IT support operations, improved SLA follow-up, coordinated vendors, and reduced unresolved ticket backlog through weekly service reviews.”</p>
          <small>More concrete, keyword-aligned, and interview-ready.</small>
        </div>
      </div>
    </section>
  )
}

function WhyNotChatGPT() {
  const rows = [
    ['Structured ATS scoring', 'Generic prompt-dependent answers', 'Consistent score, gaps, and next actions'],
    ['Saved career history', 'Usually one-off sessions', 'Analyses, cover letters, LinkedIn results, CV versions'],
    ['Application pipeline', 'Manual spreadsheet required', 'Status board with follow-ups and interview prep'],
    ['Privacy-first LinkedIn flow', 'Risky scraping prompts can appear', 'Paste-only profile optimization, no login']
  ]

  return (
    <section className="landing-section" id="comparison">
      <div className="landing-section-head centered">
        <p className="landing-kicker">Positioning</p>
        <h2>Why not just use a generic AI chat?</h2>
        <p>Because active job search needs a workflow, not just a reply. Joblytics keeps the context, tracks progress, and turns outputs into the next action.</p>
      </div>
      <div className="comparison-table" role="table" aria-label="Joblytics compared with generic AI chat">
        <div className="comparison-row comparison-head" role="row">
          <span>Need</span><span>Generic AI</span><span>Joblytics AI</span>
        </div>
        {rows.map(([need, generic, joblytics]) => (
          <div className="comparison-row" role="row" key={need}>
            <span>{need}</span><span>{generic}</span><span>{joblytics}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function FaqItem({ q, a }) {
  return (
    <details className="faq-item">
      <summary>{q}</summary>
      <p>{a}</p>
    </details>
  )
}

export default function LandingPage() {
  const { t } = useLang()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signup')
  const openAuth = mode => { setAuthMode(mode); setAuthOpen(true) }

  const workflow = useMemo(() => ([
    ['01', 'Upload or select a CV version', 'Use your uploaded CV or the active version from your CV vault.', 'Start with CV'],
    ['02', 'Analyze the job match', 'Paste a job description and see score, keyword gaps, risks, and next steps.', 'Run ATS check'],
    ['03', 'Improve the application package', 'Generate better CV bullets, a cover letter, LinkedIn improvements, and interview prep.', 'Open workspace']
  ]), [])

  return (
    <div className="landing-page-v2">
      <ConversionNav openAuth={openAuth} t={t} />

      <main>
        <section className="landing-hero-v2">
          <div className="hero-copy">
            <p className="landing-kicker">ATS checker · CV coach · job tracker · interview prep</p>
            <h1>Stop guessing. Build every application with evidence.</h1>
            <p className="hero-lead">Joblytics AI compares your CV with each job, then turns the result into a clearer CV, stronger cover letter, polished LinkedIn profile, application tracker, and interview kit.</p>
            <div className="hero-actions">
              <button className="landing-btn landing-btn-primary landing-btn-large" onClick={() => openAuth('signup')}>Check my CV match →</button>
              <a className="landing-btn landing-btn-ghost landing-btn-large" href="#how-it-works">See the workflow</a>
            </div>
            <div className="hero-proof-row">
              <span>✓ Start free</span>
              <span>✓ No LinkedIn login</span>
              <span>✓ CV versioning</span>
              <span>✓ Saved history</span>
            </div>
          </div>
          <HeroPreview />
        </section>

        <StatStrip />

        <section className="landing-section" id="how-it-works">
          <div className="landing-section-head centered">
            <p className="landing-kicker">Guided workflow</p>
            <h2>From job description to interview kit in one guided workspace.</h2>
            <p>Each result becomes the next action, so you know whether to improve the CV, apply, follow up, or prepare for the interview.</p>
          </div>
          <div className="workflow-grid">
            {workflow.map(([number, title, text, cta]) => <WorkflowStep key={number} number={number} title={title} text={text} cta={cta} onClick={() => openAuth('signup')} />)}
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-head">
            <p className="landing-kicker">Core features</p>
            <h2>Everything connected around the next application decision.</h2>
          </div>
          <div className="feature-grid-v2">
            <FeatureCard icon="🎯" title="ATS match analysis" text="Compare your CV with the role and identify hard requirements, missing keywords, proof gaps, and application risk." />
            <FeatureCard icon="🧾" title="CV version vault" text="Keep role-specific CV versions and use your active CV directly inside the analyzer." />
            <FeatureCard icon="✉️" title="Cover letter history" text="Generate, save, reopen, and reuse tailored letters connected to your job analyses." />
            <FeatureCard icon="💼" title="Application pipeline" text="Track not applied, applied, interview, follow-up, offer, and rejected opportunities." />
            <FeatureCard icon="🔗" title="LinkedIn optimizer" text="Paste profile sections or upload PDF/TXT. No LinkedIn password, login, or scraping required." />
            <FeatureCard icon="🎙️" title="Interview readiness" text="Turn saved analyses into likely questions, proof points, weak spots, and keyword reminders." />
          </div>
        </section>

        <BeforeAfter />
        <WhyNotChatGPT />

        <section className="landing-section trust-section" id="trust">
          <div>
            <p className="landing-kicker">Trust & privacy</p>
            <h2>Your career data should stay in your control.</h2>
            <p className="section-lead">Joblytics is designed as a private workspace for applicants, not a recruiter marketplace. The LinkedIn feature is paste-only, never asks for a LinkedIn password, and does not scrape private pages.</p>
          </div>
          <div className="trust-grid">
            <span>🛡️ No CV resale</span>
            <span>🔐 No LinkedIn credentials</span>
            <span>🧹 Delete saved results</span>
            <span>📄 Clear privacy page</span>
          </div>
        </section>

        <section className="landing-section pricing-preview-section">
          <div>
            <p className="landing-kicker">Pricing</p>
            <h2>Start free. Upgrade when you are actively applying.</h2>
            <p className="section-lead">The pricing page is already prepared for Free, Job Search Pass, and Pro Monthly. Checkout links can be connected later when Stripe is ready.</p>
          </div>
          <a className="pricing-preview-cta" href="/pricing">View pricing plans →</a>
        </section>

        <section className="landing-section faq-section">
          <div className="landing-section-head centered">
            <p className="landing-kicker">FAQ</p>
            <h2>Questions before you start?</h2>
          </div>
          <div className="faq-grid">
            <FaqItem q="Can I use Joblytics without a LinkedIn login?" a="Yes. The LinkedIn Optimizer is paste-only or upload-based. It does not request your LinkedIn password or perform private LinkedIn scraping." />
            <FaqItem q="Can I keep multiple CVs?" a="Yes. The CV vault is designed for role-specific versions such as IT Manager, Service Delivery Manager, Cloud, Support Director, French, or English CVs." />
            <FaqItem q="Will the tool apply to jobs automatically?" a="No. Joblytics helps you prepare stronger applications and track your pipeline. You remain in control of what gets submitted." />
            <FaqItem q="Is payment active?" a="Not yet. Pricing visuals are prepared, but paid checkout can be connected after Stripe products and price IDs are created." />
          </div>
        </section>

        <section className="landing-final-cta">
          <p className="landing-kicker">Ready</p>
          <h2>Make the next application stronger before you send it.</h2>
          <p>Upload your CV or use your saved CV version, paste a job description, and get a clear action plan before applying.</p>
          <button className="landing-btn landing-btn-primary landing-btn-large" onClick={() => openAuth('signup')}>Get started free →</button>
        </section>
      </main>

      <footer className="landing-footer-v2">
        <span>© {new Date().getFullYear()} Joblytics AI</span>
        <span>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/contact">Contact</a>
          <a href="/.well-known/security.txt">Security</a>
        </span>
      </footer>

      {authOpen && <AuthModal initialMode={authMode} onClose={() => setAuthOpen(false)} />}
    </div>
  )
}
