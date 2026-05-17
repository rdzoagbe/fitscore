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
            Build a full job-aligned CV rewrite from your current CV and a target role. This is the foundation for preview diff, Word/PDF export, and Supabase save.
          </span>
        </section>

        <CvBuilderCard selected={selectedAnalysis} />
      </main>
    </div>
  )
}
