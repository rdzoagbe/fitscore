import React from 'react'
import './SeoConversionPanel.css'

const DEFAULT_PROOF_POINTS = [
  'Exact job-description matching instead of generic CV advice',
  'Role-specific proof gaps, keywords, and next actions',
  'One workflow for CV, cover letter, LinkedIn, tracker, and interview prep'
]

export default function SeoConversionPanel({
  eyebrow = 'From reading to action',
  title = 'Turn this guidance into a role-specific application plan.',
  description = 'Paste a job description, use your CV, and get a practical checklist for improving the application before you send it.',
  primaryHref = '/app',
  primaryLabel = 'Start a free ATS check',
  secondaryHref = '/resources',
  secondaryLabel = 'Browse resources',
  proofPoints = DEFAULT_PROOF_POINTS,
  variant = 'default'
}) {
  return (
    <section className={`seo-conversion-panel seo-conversion-panel--${variant}`}>
      <div className="seo-conversion-copy">
        <p className="seo-conversion-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="seo-conversion-actions">
          <a href={primaryHref} className="seo-conversion-primary">{primaryLabel}</a>
          {secondaryHref && secondaryLabel && (
            <a href={secondaryHref} className="seo-conversion-secondary">{secondaryLabel}</a>
          )}
        </div>
      </div>

      <div className="seo-conversion-proof" aria-label="Why use Joblytics AI">
        {proofPoints.map((point) => (
          <div key={point} className="seo-conversion-proof-item">
            <span aria-hidden="true">✓</span>
            <p>{point}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
