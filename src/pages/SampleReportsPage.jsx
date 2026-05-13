import { sampleReports, getSampleReport } from '../data/sampleReports.js'
import SampleReportCard from '../components/SampleReportCard.jsx'
import './SampleReportsPage.css'

function setMeta(title, description, path = '/sample-reports') {
  if (typeof document === 'undefined') return
  document.title = title
  const ensureMeta = (selector, attr, value) => {
    let el = document.head.querySelector(selector)
    if (!el) {
      el = document.createElement('meta')
      const name = selector.match(/name="([^"]+)"/)?.[1]
      const property = selector.match(/property="([^"]+)"/)?.[1]
      if (name) el.setAttribute('name', name)
      if (property) el.setAttribute('property', property)
      document.head.appendChild(el)
    }
    el.setAttribute(attr, value)
  }
  ensureMeta('meta[name="description"]', 'content', description)
  ensureMeta('meta[property="og:title"]', 'content', title)
  ensureMeta('meta[property="og:description"]', 'content', description)
  ensureMeta('meta[property="og:url"]', 'content', `https://joblytics-ai.com${path}`)
}

function DetailReport({ report, onBack, onStart }) {
  setMeta(`${report.title} | Joblytics AI`, report.summary, `/sample-reports/${report.slug}`)
  return (
    <main className="sample-page">
      <button className="sample-back" type="button" onClick={onBack}>← Back to samples</button>
      <section className="sample-detail-hero">
        <div>
          <p className="sample-eyebrow">Demo report · {report.role}</p>
          <h1>{report.title}</h1>
          <p>{report.summary}</p>
        </div>
        <div className="sample-score-panel">
          <strong>{report.score}%</strong>
          <span>{report.verdict}</span>
        </div>
      </section>

      <section className="sample-detail-grid">
        <div className="sample-panel">
          <h2>What the report notices</h2>
          <ul>{report.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="sample-panel">
          <h2>Keywords to strengthen</h2>
          <div className="sample-keywords">{report.missingKeywords.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      </section>

      <section className="sample-panel sample-wide-panel">
        <h2>CV bullet rewrites</h2>
        {report.rewriteExamples.map((example) => (
          <div className="sample-rewrite" key={example.before}>
            <div><strong>Before</strong><p>{example.before}</p></div>
            <div><strong>After</strong><p>{example.after}</p></div>
          </div>
        ))}
      </section>

      <section className="sample-panel sample-wide-panel">
        <h2>Interview preparation generated from the same match</h2>
        <ul>{report.interviewPrep.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="sample-cta-panel">
        <div>
          <p className="sample-eyebrow">Try your own CV</p>
          <h2>Turn your next job description into a practical application plan.</h2>
          <p>Upload your CV, paste the job description, and Joblytics will show what to improve before you apply.</p>
        </div>
        <button type="button" onClick={onStart}>Run a free ATS check</button>
      </section>
    </main>
  )
}

export default function SampleReportsPage({ activeSampleSlug, onNavigate, onStart }) {
  const selected = activeSampleSlug ? getSampleReport(activeSampleSlug) : null

  if (selected) {
    return <DetailReport report={selected} onBack={() => onNavigate?.('sample-reports')} onStart={onStart} />
  }

  setMeta('Sample ATS reports and application outputs | Joblytics AI', 'Preview realistic Joblytics AI outputs for ATS matching, CV rewrites, LinkedIn profile optimization, and interview preparation.', '/sample-reports')

  return (
    <main className="sample-page">
      <section className="sample-list-hero">
        <p className="sample-eyebrow">Sample reports</p>
        <h1>See what Joblytics produces before you sign in.</h1>
        <p>Preview the type of application readiness report, rewrite guidance, keyword gaps, and interview preparation users receive after analyzing a CV against a job description.</p>
      </section>

      <section className="sample-list-grid">
        {sampleReports.map((report) => (
          <SampleReportCard key={report.slug} report={report} onOpen={(slug) => onNavigate?.(`sample-reports/${slug}`)} />
        ))}
      </section>

      <section className="sample-cta-panel">
        <div>
          <p className="sample-eyebrow">Your own result will be private</p>
          <h2>Use the sample reports to understand the workflow, then run a private analysis with your own CV.</h2>
          <p>Joblytics does not ask for your LinkedIn password and does not publish your CV or application data.</p>
        </div>
        <button type="button" onClick={onStart}>Start free analysis</button>
      </section>
    </main>
  )
}
