const ROLE_TARGETS = [
  {
    title: 'IT Support Manager',
    category: 'Support leadership',
    level: 'Manager',
    keywords: ['support', 'helpdesk', 'service desk', 'itil', 'sla', 'kpi', 'zendesk', 'freshdesk', 'jira', 'microsoft 365', 'intune', 'endpoint', 'team leadership', 'user support'],
    reasons: ['Strong fit for service delivery, support operations and team coordination.', 'Relevant when your profile shows ticketing, SLA/KPI and endpoint management experience.'],
    gaps: ['Budget ownership', 'Vendor management depth'],
    searchQuery: 'IT Support Manager'
  },
  {
    title: 'Workplace / Modern Endpoint Manager',
    category: 'Microsoft endpoint',
    level: 'Senior IC / Manager',
    keywords: ['intune', 'autopilot', 'endpoint', 'microsoft 365', 'defender', 'windows', 'device management', 'powershell', 'compliance', 'entra', 'azure ad'],
    reasons: ['Good fit when your CV shows Intune, Autopilot, Defender and Microsoft 365 administration.', 'Often aligned with companies modernizing device provisioning and endpoint security.'],
    gaps: ['Conditional Access governance', 'Large-scale rollout metrics'],
    searchQuery: 'Modern Workplace Endpoint Manager Intune'
  },
  {
    title: 'Infrastructure & Cloud Manager',
    category: 'Infrastructure / Cloud',
    level: 'Manager',
    keywords: ['azure', 'cloud', 'infrastructure', 'server', 'network', 'security', 'migration', 'backup', 'monitoring', 'vendor', 'run', 'production'],
    reasons: ['Strong fit for RUN ownership, infrastructure reliability and cloud migration environments.', 'Works well when the profile shows production support, cloud projects and service governance.'],
    gaps: ['FinOps / cloud cost optimization', 'Formal architecture ownership'],
    searchQuery: 'Infrastructure Cloud Manager Azure'
  },
  {
    title: 'Business Applications Manager',
    category: 'Business systems',
    level: 'Manager',
    keywords: ['business applications', 'crm', 'erp', 'sql', 'power bi', 'sharepoint', 'power platform', 'integration', 'stakeholder', 'operations', 'ticketing'],
    reasons: ['Good fit when your experience connects IT delivery with business operations.', 'Relevant for companies needing ownership of CRM, ERP, analytics and application integrations.'],
    gaps: ['ERP-specific ownership', 'Product roadmap governance'],
    searchQuery: 'Business Applications Manager'
  },
  {
    title: 'Service Delivery Manager',
    category: 'IT service management',
    level: 'Manager',
    keywords: ['service delivery', 'itil', 'sla', 'kpi', 'vendor', 'incident', 'problem management', 'change management', 'support', 'run', 'governance'],
    reasons: ['Strong option when your profile shows operational governance and service quality ownership.', 'Good bridge role if you want to move from hands-on support leadership into strategic delivery.'],
    gaps: ['Contractual SLA ownership', 'QBR / steering committee examples'],
    searchQuery: 'IT Service Delivery Manager'
  },
  {
    title: 'IT Operations Manager',
    category: 'Operations',
    level: 'Manager',
    keywords: ['operations', 'run', 'production', 'support', 'incident', 'monitoring', 'process', 'team', 'security', 'cloud', 'infrastructure', 'continuous improvement'],
    reasons: ['Relevant when the profile shows end-to-end IT operations, production support and process improvement.', 'A strong target for candidates who combine hands-on technical depth with operational leadership.'],
    gaps: ['Operational budget', 'Multi-site or 24/7 scope'],
    searchQuery: 'IT Operations Manager'
  }
]

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function collectText(value, depth = 0) {
  if (!value || depth > 4) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(item => collectText(item, depth + 1)).join(' ')
  if (typeof value === 'object') return Object.values(value).map(item => collectText(item, depth + 1)).join(' ')
  return ''
}

function buildProfileText(analyses = []) {
  const recentAnalyses = Array.isArray(analyses) ? analyses.slice(0, 12) : []
  return normalize(recentAnalyses.map(item => collectText(item)).join(' '))
}

function getSearchUrl(query) {
  const encoded = encodeURIComponent(query)
  return `https://www.linkedin.com/jobs/search/?keywords=${encoded}`
}

export function getMatchedJobs(analyses = []) {
  const profileText = buildProfileText(analyses)
  const hasProfileSignal = profileText.length > 120

  return ROLE_TARGETS.map(role => {
    const matchedKeywords = role.keywords.filter(keyword => profileText.includes(normalize(keyword)))
    const matchRatio = matchedKeywords.length / role.keywords.length
    const score = hasProfileSignal
      ? Math.max(54, Math.min(96, Math.round(52 + matchRatio * 44)))
      : role.title === 'IT Support Manager' ? 78 : role.title === 'Workplace / Modern Endpoint Manager' ? 74 : 68

    return {
      ...role,
      score,
      matchedKeywords: matchedKeywords.slice(0, 6),
      searchUrl: getSearchUrl(role.searchQuery),
      isProfileBased: hasProfileSignal
    }
  }).sort((a, b) => b.score - a.score).slice(0, 3)
}
