import React, { useEffect } from 'react'
import LeadCaptureForm from '../components/LeadCaptureForm'
import './EarlyAccessPage.css'

export default function EarlyAccessPage() {
  useEffect(() => {
    document.title = 'Early Access | Joblytics AI'
    const description = 'Join the Joblytics AI early access list for product updates, pricing launch news, and application readiness tips.'
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
  }, [])

  return (
    <main className="earlyAccessPage">
      <section className="earlyAccessHero">
        <p className="earlyAccessHero__eyebrow">Public beta</p>
        <h1>Join the Joblytics early access list.</h1>
        <p>
          Get notified when checkout is ready, receive practical application-readiness examples, and help shape the next product priorities.
        </p>
      </section>

      <LeadCaptureForm
        sourceLabel="early_access_page"
        title="Tell us what kind of job-search help you need."
        description="We will use your answer to prioritize the best examples, templates, and product improvements. No payment is taken from this form."
      />

      <section className="earlyAccessNotes">
        <article>
          <h2>What you will receive</h2>
          <p>Launch updates, practical examples, and occasional product notes about CV scoring, LinkedIn profile improvement, application tracking, and interview preparation.</p>
        </article>
        <article>
          <h2>What we do not ask for</h2>
          <p>No LinkedIn password, no payment details, no confidential employer data, and no private profile scraping.</p>
        </article>
      </section>
    </main>
  )
}
