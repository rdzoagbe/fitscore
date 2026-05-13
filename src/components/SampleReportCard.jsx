import './SampleReportCard.css'

export default function SampleReportCard({ report, onOpen }) {
  if (!report) return null
  return (
    <article className="sample-report-card">
      <div className="sample-report-card__top">
        <div>
          <p className="sample-report-card__eyebrow">Sample output</p>
          <h3>{report.title}</h3>
          <p>{report.summary}</p>
        </div>
        <div className="sample-report-card__score" aria-label={`Sample score ${report.score} percent`}>
          <strong>{report.score}%</strong>
          <span>{report.verdict}</span>
        </div>
      </div>
      <div className="sample-report-card__chips">
        {report.missingKeywords.slice(0, 4).map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>
      <button type="button" className="sample-report-card__button" onClick={() => onOpen?.(report.slug)}>
        View sample report
      </button>
    </article>
  )
}
