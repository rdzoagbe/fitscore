export const navGroups = [
  {
    title: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'D', description: 'Main cockpit overview' },
      { href: '/tracker', label: 'Job Tracker', icon: 'T', description: 'Applications, statuses and follow-up intelligence' },
      { href: '/scanner', label: 'ATS Scanner', icon: 'S', description: 'Compare CV versions against job descriptions' },
      { href: '/cover-letters', label: 'Cover Letters', icon: 'C', description: 'Generate and review saved letters' }
    ]
  },
  {
    title: 'Prepare',
    items: [
      { href: '/interview', label: 'Interview Prep', icon: 'I', description: 'Generate role-specific interview preparation' },
      { href: '/cv-enhancer', label: 'CV Enhancer', icon: 'V', description: 'Upload, parse and improve CV versions' },
      { href: '/keywords', label: 'Keywords', icon: 'K', description: 'Keyword intelligence from ATS history' }
    ]
  },
  {
    title: 'Reports',
    items: [
      { href: '/analytics', label: 'Analytics', icon: 'A', description: 'Conversion rates, platforms and trends' },
      { href: '/export-ipr', label: 'Export IPR', icon: 'E', description: 'France Travail evidence dossier export' }
    ]
  },
  {
    title: 'Account',
    items: [
      { href: '/billing', label: 'Billing & Usage', icon: 'B', description: 'Current plan and usage limits' },
      { href: '/pricing', label: 'Pricing', icon: 'P', description: 'Public plans and checkout-safe pricing' },
      { href: '/settings', label: 'Settings', icon: 'S', description: 'Account, profile and preferences' }
    ]
  }
] as const

export const mobileNavItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/tracker', label: 'Track' },
  { href: '/scanner', label: 'Scan' },
  { href: '/cover-letters', label: 'Letters' },
  { href: '/settings', label: 'Account' }
] as const
