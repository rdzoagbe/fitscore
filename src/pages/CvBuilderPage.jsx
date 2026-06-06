import React from 'react'
import CvBuilderCard from '../components/CvBuilderCard'

export default function CvBuilderPage({ selectedAnalysis }) {
  return (
    <div className="cvBuilder-page">
      <main className="cvBuilder-shell">
        <section className="cvBuilder-hero">
          <p>CV Builder</p>
          <h1>Rewrite your CV for a specific job.</h1>
          <span>
            Select a saved job analysis, then generate a tailored CV rewrite that addresses the job's requirements, fills keyword gaps, and passes ATS filters. Download the result as a PDF or copy it directly.
          </span>
        </section>

        <CvBuilderCard selected={selectedAnalysis} />
      </main>
    </div>
  )
}
