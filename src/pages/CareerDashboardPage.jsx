import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useProgressMetrics } from '../hooks/useProgressMetrics'
import { useUsageSummary } from '../hooks/useUsageSummary'
import { extractScore, getUserDisplayName } from '../utils/progressUtils'
import './CareerDashboardPage.css'

function Kpi({ tone, label, value, delta }) {
  return <article className={`cockpit-kpi ${tone}`}><p>{label}</p><strong>{value}</strong><span>{delta}</span></article>
}

function Stage({ color, name, count, width }) {
  return <div className="cockpit-stage"><i style={{ background: color }} /><span>{name}</span><b><em style={{ width: `${width}%`, background: color }} /></b><strong>{count}</strong></div>
}

function ScoreRow({ label, value, color }) {
  return <div className="cockpit-scoreRow"><span>{label}</span><b><i style={{ width: `${value}%`, background: color }} /></b><em style={{ color }}>{value}%</em></div>
}

function SkillRow({ name, value, status, tone }) {
  const color = tone === 'strong' ? '#34d399' : tone === 'gap' ? '#f87171' : tone === 'warn' ? '#fb923c' : '#38bdf8'
  return <div className="cockpit-skillRow"><span>{name}</span><b><i style={{ width: `${value}%`, background: color }} /></b><em>{value}%</em><small className={tone}>{status}</small></div>
}

function Activity({ title, subtitle, status, tone }) {
  return <article className="cockpit-feedItem"><i className={tone} /><span><strong>{title}</strong><small>{subtitle}</small><em>recent</em></span><b className={tone}>{status}</b></article>
}

function JobCard({ logo, title, company, score, tags, tone = 'good' }) {
  return <article className="cockpit-jobCard"><span className={`cockpit-jobLogo ${tone}`}>{logo}</span><span className="cockpit-jobInfo"><strong>{title}</strong><small>{company}</small><span>{tags.map(tag => <em key={tag}>{tag}</em>)}</span></span><b className={`cockpit-jobScore ${tone}`}>{score}%<small>ATS match</small></b></article>
}

export default function CareerDashboardPage({ setPage }) {
  const { user } = useAuth()
  const metrics = useProgressMetrics({})
  const usage = useUsageSummary()
  const name = getUserDisplayName(user)
  const recent = metrics.analyses?.slice(0, 4) || []
  const bestScore = metrics.bestScore || 74
  const avgScore = metrics.averageScore || 74
  const applications = Math.max(metrics.analysesCount || 0, recent.length || 47)

  return (
    <div className="cockpit-page">
      <aside className="cockpit-sidebar">
        <button className="cockpit-logo" type="button" onClick={() => setPage?.('dashboard')}><span>J</span><strong>Job<i>lytics</i></strong></button>
        <nav className="cockpit-nav">
          <p>Workspace</p>
          <button className="active" onClick={() => setPage?.('dashboard')}>Dashboard</button>
          <button onClick={() => setPage?.('history')}>Job Tracker</button>
          <button onClick={() => setPage?.('analyzer')}>ATS Scanner</button>
          <button onClick={() => setPage?.('history')}>Cover Letters</button>
          <p>Prepare</p>
          <button onClick={() => setPage?.('coach')}>Interview Prep</button>
          <button onClick={() => setPage?.('coach')}>CV Enhancer</button>
          <button onClick={() => setPage?.('linkedin')}>LinkedIn</button>
          <p>Reports</p>
          <button onClick={() => setPage?.('admin')}>Analytics</button>
        </nav>
        <div className="cockpit-user"><span>{name?.split(' ').map(part => part[0]).join('').slice(0, 2) || 'JD'}</span><div><strong>{name}</strong><small>Active workspace</small></div></div>
      </aside>

      <header className="cockpit-topbar">
        <h1>Dashboard <span>Week 22</span></h1>
        <div className="cockpit-search">Search jobs, companies…</div>
        <button onClick={() => setPage?.('analyzer')}>Upload CV</button>
        <button className="primary" onClick={() => setPage?.('analyzer')}>Add Application</button>
        <span className="cockpit-bell">•</span>
      </header>

      <main className="cockpit-main">
        <section className="cockpit-kpiRow">
          <Kpi tone="blue" label="Applications" value={applications} delta="+8 this week" />
          <Kpi tone="purple" label="Interviews" value="6" delta="+2 scheduled" />
          <Kpi tone="green" label="Avg ATS Score" value={`${avgScore}%`} delta="+6pts vs last week" />
          <Kpi tone="orange" label="Response Rate" value="19%" delta="-2pts vs avg" />
        </section>

        <section className="cockpit-midGrid">
          <article className="cockpit-panel">
            <div className="cockpit-panelHead"><h2>Application pipeline</h2><button onClick={() => setPage?.('history')}>View all →</button></div>
            <div className="cockpit-stages"><Stage color="#38bdf8" name="Applied" count="32" width={85}/><Stage color="#67e8f9" name="Screening" count="6" width={32}/><Stage color="#818cf8" name="Interview" count="5" width={26}/><Stage color="#fb923c" name="Assessment" count="2" width={11}/><Stage color="#34d399" name="Offer" count="1" width={5}/><Stage color="#f87171" name="Closed" count="1" width={6}/></div>
            <div className="cockpit-sparkTitle">Applications / week</div><svg className="cockpit-spark" viewBox="0 0 260 60" preserveAspectRatio="none"><path d="M0,52 L32,44 L64,38 L96,30 L128,22 L160,18 L192,10 L224,8 L260,4 L260,60 L0,60Z"/><polyline points="0,52 32,44 64,38 96,30 128,22 160,18 192,10 224,8 260,4"/></svg>
          </article>

          <article className="cockpit-panel cockpit-scorePanel">
            <div className="cockpit-panelHead"><h2>Latest ATS score</h2><button onClick={() => setPage?.('analyzer')}>New scan →</button></div>
            <div className="cockpit-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50"/><circle className="progress" cx="60" cy="60" r="50"/></svg><div><strong>{bestScore}</strong><span>ATS Match</span></div></div>
            <p>Latest CV and role match analysis</p><ScoreRow label="Keywords" value={88} color="#34d399"/><ScoreRow label="Experience" value={80} color="#38bdf8"/><ScoreRow label="Skills" value={72} color="#818cf8"/><ScoreRow label="Format" value={58} color="#fb923c"/><ScoreRow label="Education" value={65} color="#94a3b8"/><button className="cockpit-wideBtn" onClick={() => setPage?.('coach')}>Improve score</button>
          </article>

          <article className="cockpit-panel"><div className="cockpit-panelHead"><h2>Recent activity</h2><button onClick={() => setPage?.('history')}>All →</button></div><div className="cockpit-feed">{recent.length ? recent.map((item, index) => <Activity key={index} title={item?.result?.job_context?.company || item?.company || `Analysis ${index + 1}`} subtitle={item?.result?.job_context?.title || item?.jobTitle || `Score ${extractScore(item) || '—'}%`} status="Scored" tone="blue" />) : <><Activity title="Latest analysis" subtitle="ATS match completed" status="Scored" tone="blue"/><Activity title="CV workspace" subtitle="Profile improvement pending" status="Open" tone="purple"/><Activity title="Pipeline" subtitle="Application tracking active" status="Live" tone="green"/></>}</div></article>
        </section>

        <section className="cockpit-bottomGrid">
          <article className="cockpit-panel"><div className="cockpit-panelHead"><h2>Top ATS matches</h2><button onClick={() => setPage?.('analyzer')}>Browse all →</button></div><div className="cockpit-tabs"><button className="active">Recommended</button><button>Saved</button><button>New today</button></div><div className="cockpit-jobList"><JobCard logo="IT" title="IT Infrastructure Manager" company="Target role · High match" score="91" tags={['Azure','M365','Intune']}/><JobCard logo="SD" title="Service Delivery Manager" company="Target role · Strong fit" score="78" tags={['ITIL','PowerShell']} tone="mid"/><JobCard logo="PM" title="Chef de Projet SI Senior" company="Target role · Review gaps" score="69" tags={['Cybersec','Entra ID']} tone="low"/></div></article>
          <article className="cockpit-panel"><div className="cockpit-panelHead"><h2>Skills gap analysis</h2><button onClick={() => setPage?.('coach')}>Full report →</button></div><p className="cockpit-muted">Based on {applications} job descriptions scanned</p><div className="cockpit-skills"><SkillRow name="Azure / Entra ID" value={92} status="✓ Strong" tone="strong"/><SkillRow name="Microsoft 365" value={88} status="✓ Strong" tone="strong"/><SkillRow name="Cybersecurity" value={80} status="Good" tone="good"/><SkillRow name="ITIL / ITSM" value={74} status="Good" tone="good"/><SkillRow name="Power BI" value={45} status="Gap" tone="warn"/><SkillRow name="SAP / ERP" value={28} status="Gap" tone="gap"/><SkillRow name="PMP / Prince2" value={35} status="Gap" tone="gap"/></div><button className="cockpit-outlineWide" onClick={() => setPage?.('coach')}>Build learning plan</button></article>
        </section>
      </main>
    </div>
  )
}
