import React from 'react'
import SeoHead from '../components/SeoHead'
import { getRolePage, seoRolePages } from '../data/seoRolePages'
import './RoleLandingPages.css'

function PillList({ items }) {
  return (
    <div className="role-pill-list">
      {items.map((item) => <span key={item} className="role-pill">{item}</span>)}
    </div>
  )
}

function RoleNotFound() {
  return (
    <main className="role-page-shell">
      <SeoHead
        title="Role CV checker pages | Joblytics AI"
        description="Explore Joblytics AI role-specific CV checker pages for IT, service delivery, cloud, support, data center, and business applications roles."
        canonical="https://joblytics-ai.com/roles"
      />
      <section className="role-hero role-hero-simple">
        <p className="role-kicker">Role-specific CV checkers</p>
        <h1>Choose the role you are targeting.</h1>
        <p>Use a focused page when you want Joblytics to evaluate the language, proof points, and keywords that matter for a specific career path.</p>
        <div className="role-card-grid compact">
          {seoRolePages.map((page) => (
            <a key={page.slug} className="role-link-card" href={`/roles/${page.slug}`}>
              <strong>{page.role}</strong>
              <span>{page.audience}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

export default function RoleLandingPage({ slug }) {
  const page = getRolePage(slug)
  if (!page) return <RoleNotFound />

  const canonicalPath = `/roles/${page.slug}`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: `https://joblytics-ai.com${canonicalPath}`,
    about: page.role,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Joblytics AI',
      url: 'https://joblytics-ai.com'
    }
  }

  return (
    <main className="role-page-shell">
      <SeoHead
        title={page.title}
        description={page.description}
        canonical={`https://joblytics-ai.com${canonicalPath}`}
        jsonLd={structuredData}
      />

      <section className="role-hero">
        <div className="role-hero-copy">
          <p className="role-kicker">Role-specific CV checker</p>
          <h1>{page.headline}</h1>
          <p className="role-lead">{page.subheadline}</p>
          <div className="role-hero-actions">
            <a className="role-btn role-btn-primary" href="/app">Check my CV against a job →</a>
            <a className="role-btn role-btn-secondary" href="/resources/ats-cv-checker">Read the ATS guide</a>
          </div>
          <p className="role-trust-note">No LinkedIn login. No recruiter marketplace. Your CV analysis stays inside your workspace.</p>
        </div>

        <aside className="role-preview-card" aria-label={`${page.role} CV analysis preview`}>
          <div className="role-preview-header">
            <span>Preview</span>
            <strong>{page.role}</strong>
          </div>
          <div className="role-score-ring">
            <span>82%</span>
            <small>match after tuning</small>
          </div>
          <div className="role-preview-list">
            <p><strong>Improve first:</strong> add measurable proof before applying.</p>
            <p><strong>Keyword gap:</strong> surface the role language recruiters expect.</p>
            <p><strong>Next step:</strong> generate a cover letter and interview kit from the same context.</p>
          </div>
        </aside>
      </section>

      <section className="role-section role-two-col">
        <div>
          <p className="role-kicker">What Joblytics checks</p>
          <h2>Make the CV match the job, not just the job title.</h2>
          <p>Joblytics compares your CV against the exact job description and highlights what is missing, weak, or too generic for this role type.</p>
        </div>
        <div className="role-checklist">
          {page.evaluates.map((item) => <div key={item}>✓ {item}</div>)}
        </div>
      </section>

      <section className="role-section">
        <p className="role-kicker">Keywords to surface naturally</p>
        <h2>Role language that should appear with evidence.</h2>
        <PillList items={page.primaryKeywords} />
      </section>

      <section className="role-section before-after-role">
        <div className="before-after-header">
          <p className="role-kicker">Copy polish example</p>
          <h2>Turn flat responsibility text into credible achievement language.</h2>
        </div>
        <div className="before-after-grid">
          <div className="role-example-card muted">
            <span>Before</span>
            <p>“{page.before}”</p>
          </div>
          <div className="role-example-card strong">
            <span>After</span>
            <p>“{page.after}”</p>
          </div>
        </div>
      </section>

      <section className="role-section role-workflow">
        <p className="role-kicker">Workflow</p>
        <h2>From role fit to interview preparation.</h2>
        <div className="role-workflow-grid">
          <div><strong>1. Paste the job</strong><span>Use the exact job description so the analysis reflects real requirements.</span></div>
          <div><strong>2. Use your active CV</strong><span>Analyze from your CV vault or upload a fresh version.</span></div>
          <div><strong>3. Improve with evidence</strong><span>Get missing keywords, weak sections, and rewrite priorities.</span></div>
          <div><strong>4. Continue the application</strong><span>Generate the cover letter, track the application, and prepare interview answers.</span></div>
        </div>
      </section>

      <section className="role-section role-faq">
        <p className="role-kicker">FAQ</p>
        <h2>Common questions for {page.role} applications.</h2>
        <div className="role-faq-grid">
          {page.faq.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="role-final-cta">
        <p className="role-kicker">Ready</p>
        <h2>Check your {page.role} application before you send it.</h2>
        <p>Upload your CV or use your active CV version, paste the job description, and get a role-specific action plan.</p>
        <a className="role-btn role-btn-primary" href="/app">Start the analysis →</a>
      </section>
    </main>
  )
}
