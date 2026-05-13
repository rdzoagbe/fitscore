import React from 'react'
import SeoHead from '../components/SeoHead'
import SeoConversionPanel from '../components/SeoConversionPanel'
import { seoResources } from '../data/seoResources'
import './ResourcePages.css'
import LeadCaptureForm from '../components/LeadCaptureForm'

export default function ResourceHubPage() {
  const canonical = 'https://joblytics-ai.com/resources'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Joblytics AI Career Resources',
    url: canonical,
    description: 'Career resources for ATS CV checks, CV optimization, cover letters, LinkedIn optimization, job tracking, and interview preparation.',
    hasPart: seoResources.map(item => ({ '@type': 'Article', headline: item.title, url: `https://joblytics-ai.com/resources/${item.slug}` }))
  }

  return (
    <main className="resourcePage">
      <SeoHead
        title="Career Resources for ATS CVs, Cover Letters & Job Tracking | Joblytics AI"
        description="Practical career resources for ATS CV checks, CV keyword matching, cover letters, LinkedIn optimization, job tracking, and interview preparation."
        canonical={canonical}
        jsonLd={jsonLd}
      />

      <section className="resourceHero">
        <p className="resourceKicker">Career resources</p>
        <h1>Build a smarter job search from CV to interview.</h1>
        <p>
          Practical guides for improving your CV, matching job descriptions, writing stronger cover letters, optimizing LinkedIn, tracking applications, and preparing interviews.
        </p>
        <div className="resourceHeroActions">
          <a href="/" className="resourcePrimaryCta">Start free analysis</a>
          <a href="/pricing" className="resourceSecondaryCta">See plans</a>
        </div>
      </section>

      <section className="resourceGrid" aria-label="Career resource guides">
        {seoResources.map(item => (
          <article className="resourceCard" key={item.slug}>
            <div>
              <p className="resourceCategory">{item.category}</p>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
            <div className="resourceCardMeta">
              <span>{item.readingTime}</span>
              <a href={`/resources/${item.slug}`}>Read guide →</a>
            </div>
          </article>
        ))}
      </section>

      <section className="resourceSeoBlock">
        <div>
          <p className="resourceKicker">Why this matters</p>
          <h2>Job seekers do not need another generic AI text box.</h2>
        </div>
        <p>
          They need a workflow: analyze the job, compare the CV, improve the application, generate the cover letter, optimize the profile, track the pipeline, and prepare the interview. These resources support the same workflow inside Joblytics AI.
        </p>
      </section>

      <SeoConversionPanel
        eyebrow="Ready to test your application?"
        title="Move from reading guides to improving one real application."
        description="Paste a job description and compare it with your CV to see the missing keywords, proof gaps, and next best action before applying."
        primaryHref="/app"
        primaryLabel="Start a free ATS check"
        secondaryHref="/roles"
        secondaryLabel="Browse role-specific checkers"
      />
    
      <LeadCaptureForm
        compact
        sourceLabel="resource_hub"
        title="Get a practical application-readiness checklist."
        description="Join early access and receive examples for CV scoring, cover letters, LinkedIn profile improvement, tracking, and interview preparation."
      />
</main>
  )
}
