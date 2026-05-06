export const dailyChallenges = [
  {
    id: 'cv-bullet-impact',
    category: 'CV',
    title: 'Improve one CV bullet',
    description: 'Rewrite one generic responsibility into a measurable achievement.',
    estimatedMinutes: 5,
    difficulty: 'Easy',
    why: 'Recruiters scan for impact, not just tasks.',
    task: 'Pick one weak bullet from your CV and rewrite it with action, scope, and result.',
    exampleBefore: 'Managed IT support team.',
    exampleAfter: 'Led a 6-person IT support team, improving ticket resolution time by 32% across 400+ monthly requests.',
    cta: 'Start challenge'
  },
  {
    id: 'cv-summary-focus',
    category: 'CV',
    title: 'Sharpen your professional summary',
    description: 'Make your CV summary clearer, more targeted, and recruiter-friendly.',
    estimatedMinutes: 7,
    difficulty: 'Easy',
    why: 'A strong summary helps recruiters understand your value in seconds.',
    task: 'Write a 3-line summary that includes your role, strengths, and measurable value.',
    exampleBefore: 'Experienced IT professional with strong technical skills.',
    exampleAfter: 'IT Manager with 10+ years leading support, infrastructure, and workplace technology teams. Skilled in Intune, ITSM, device management, and service delivery.',
    cta: 'Improve summary'
  },
  {
    id: 'interview-pitch',
    category: 'Interview',
    title: 'Prepare your 30-second pitch',
    description: 'Create a clear answer to “Tell me about yourself.”',
    estimatedMinutes: 8,
    difficulty: 'Medium',
    why: 'Your first answer sets the tone for the interview.',
    task: 'Write a short pitch covering who you are, what you do well, and what role you want next.',
    exampleBefore: 'I work in IT and have done support and management.',
    exampleAfter: 'I’m an IT Manager with a strong background in support operations, endpoint management, and service delivery. I help teams improve user experience, structure support processes, and deliver reliable IT services.',
    cta: 'Build pitch'
  },
  {
    id: 'skills-priority',
    category: 'CV',
    title: 'Prioritize your top skills',
    description: 'Choose the 8–12 skills that best match your target role.',
    estimatedMinutes: 5,
    difficulty: 'Easy',
    why: 'Too many generic skills dilute your positioning.',
    task: 'Remove weak or outdated skills and keep the ones most relevant to your target job.',
    exampleBefore: 'Microsoft Office, Windows, Communication, Teamwork, Hardware, Software, IT.',
    exampleAfter: 'Microsoft Intune, Autopilot, ITSM, Jira, Freshdesk, ITIL, Endpoint Security, Microsoft 365, SLA Management.',
    cta: 'Review skills'
  },
  {
    id: 'achievement-metrics',
    category: 'CV',
    title: 'Add numbers to your achievements',
    description: 'Add measurable proof to one part of your experience.',
    estimatedMinutes: 6,
    difficulty: 'Easy',
    why: 'Numbers make your contribution easier to trust.',
    task: 'Add a metric such as team size, ticket volume, resolution time, devices managed, users supported, budget, or project duration.',
    exampleBefore: 'Improved support processes.',
    exampleAfter: 'Standardized support processes for 500+ users, improving SLA visibility and reducing recurring support issues.',
    cta: 'Add metrics'
  },
  {
    id: 'application-message',
    category: 'Job Search',
    title: 'Write a stronger application message',
    description: 'Create a short message you can send with a job application or recruiter contact.',
    estimatedMinutes: 7,
    difficulty: 'Easy',
    why: 'A clear message can increase response rates.',
    task: 'Write a 4-line message: role interest, relevant experience, proof, and call to action.',
    exampleBefore: 'Hello, I am interested in this job. Please see my CV.',
    exampleAfter: 'Hello, I’m interested in the IT Manager role. I bring strong experience in support leadership, endpoint management, and ITSM operations. I’d welcome the opportunity to discuss how I can help improve service delivery and user experience.',
    cta: 'Write message'
  }
]

export function getDailyChallenge(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  const dayOfYear = Math.floor(diff / 86400000)
  return dailyChallenges[dayOfYear % dailyChallenges.length]
}
