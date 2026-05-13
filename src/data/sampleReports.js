export const sampleReports = [
  {
    slug: 'it-manager-ats-report',
    title: 'IT Manager ATS readiness report',
    role: 'IT Manager',
    score: 82,
    verdict: 'Strong fit with targeted proof gaps',
    summary: 'This sample shows how Joblytics turns a CV and job description into a practical application plan: what to keep, what to rewrite, which keywords to mirror, and what to prepare for interviews.',
    highlights: [
      'Strong alignment with service delivery, stakeholder management, and Microsoft 365 operations.',
      'CV needs more measurable leadership proof around incident reduction, vendor governance, and budget ownership.',
      'Recommended next action: rewrite the top 4 bullets before applying.'
    ],
    missingKeywords: ['ITIL governance', 'vendor performance', 'budget tracking', 'executive reporting', 'change advisory board'],
    rewriteExamples: [
      {
        before: 'Managed IT support and improved user satisfaction.',
        after: 'Led a 6-person support team across 450+ users, reducing recurring incidents by 28% through SLA tracking, root-cause reviews, and knowledge-base improvements.'
      },
      {
        before: 'Worked with suppliers and internal stakeholders.',
        after: 'Governed MSP and SaaS partners through weekly service reviews, KPI dashboards, and escalation routines, improving ticket ageing and change visibility for senior stakeholders.'
      }
    ],
    interviewPrep: [
      'Explain how you balance operational reliability with transformation work.',
      'Prepare a concrete example of vendor escalation and SLA recovery.',
      'Quantify your team leadership impact with numbers, not only responsibilities.'
    ]
  },
  {
    slug: 'service-delivery-manager-report',
    title: 'Service Delivery Manager application report',
    role: 'Service Delivery Manager',
    score: 76,
    verdict: 'Apply after improving delivery metrics',
    summary: 'This sample demonstrates how Joblytics identifies whether a delivery-focused CV proves enough ownership of incidents, changes, vendors, SLAs, and continuous improvement.',
    highlights: [
      'Good match on operational coordination and ITSM vocabulary.',
      'Needs clearer evidence of CAB ownership, backlog prioritisation, and cross-team escalation.',
      'Recommended next action: add 2 metrics and one service-improvement story.'
    ],
    missingKeywords: ['service review', 'CAB', 'problem management', 'continuous improvement', 'operational backlog'],
    rewriteExamples: [
      {
        before: 'Responsible for incidents and changes.',
        after: 'Coordinated incident, problem, and change workflows across infrastructure and application teams, improving SLA visibility through weekly service reviews and structured CAB preparation.'
      },
      {
        before: 'Helped improve IT processes.',
        after: 'Introduced a service-improvement backlog ranked by business impact, reducing repeated support escalations and giving stakeholders a transparent view of delivery priorities.'
      }
    ],
    interviewPrep: [
      'Prepare your definition of good service delivery in one minute.',
      'Give an example of a difficult change window and how you reduced risk.',
      'Explain which KPIs you monitor weekly and why.'
    ]
  },
  {
    slug: 'cloud-infrastructure-report',
    title: 'Cloud Infrastructure CV match report',
    role: 'Cloud Infrastructure Lead',
    score: 71,
    verdict: 'Promising profile, technical proof needs sharpening',
    summary: 'This sample shows how Joblytics separates general cloud exposure from role-ready evidence such as migration ownership, security controls, automation, and production reliability.',
    highlights: [
      'Relevant Azure and Microsoft 365 exposure is present.',
      'CV should show clearer ownership of cloud migration, monitoring, IaC, and operational resilience.',
      'Recommended next action: add architecture, automation, and security proof points.'
    ],
    missingKeywords: ['landing zone', 'IaC', 'monitoring', 'cost optimisation', 'identity governance'],
    rewriteExamples: [
      {
        before: 'Worked on cloud and infrastructure projects.',
        after: 'Supported Azure infrastructure modernisation by coordinating identity, device, and security controls, aligning implementation work with operational support readiness and governance requirements.'
      },
      {
        before: 'Managed cloud services.',
        after: 'Monitored cloud service reliability, access controls, and endpoint compliance, escalating risks through documented remediation plans and stakeholder reporting.'
      }
    ],
    interviewPrep: [
      'Be ready to explain your strongest cloud migration example.',
      'Prepare a monitoring and incident-response story.',
      'Clarify your level of hands-on automation versus coordination.'
    ]
  }
]

export function getSampleReport(slug) {
  return sampleReports.find((report) => report.slug === slug) || null
}
