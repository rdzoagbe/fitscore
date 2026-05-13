import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const replacements = [
  {
    file: 'src/pages/LandingPage.jsx',
    pairs: [
      ['Improve your CV with AI', 'Know if your CV is ready before you apply'],
      ['AI-powered ATS CV checker', 'Application readiness, scored before you apply'],
      ['Run a free ATS check', 'Check my CV match'],
      ['See how it works', 'See the workflow'],
      ['Stop applying blind.', 'Stop applying without knowing what recruiters and ATS systems will see.'],
      ['Get better results', 'Make the next application stronger']
    ]
  },
  {
    file: 'src/pages/PricingPage.jsx',
    pairs: [
      ['Checkout coming soon', 'Checkout is being prepared'],
      ['Contact us', 'Request pilot access'],
      ['Upgrade', 'Unlock the full workflow'],
      ['Start now', 'Start with the free workflow']
    ]
  },
  {
    file: 'src/pages/LinkedInOptimizerPage.jsx',
    pairs: [
      ['LinkedIn Optimizer', 'LinkedIn profile readiness'],
      ['Analyze pasted content', 'Review my profile sections'],
      ['Save to history', 'Save to my career history']
    ]
  },
  {
    file: 'src/pages/CareerDashboardPage.jsx',
    pairs: [
      ['Career Dashboard', 'Application command center'],
      ['Next best action', 'Recommended next move'],
      ['Track your progress', 'See what is ready and what needs work']
    ]
  },
  {
    file: 'src/pages/CvCoachPage.jsx',
    pairs: [
      ['CV Coach', 'CV improvement workspace'],
      ['Generate cover letter', 'Create tailored application message'],
      ['Saved letters', 'Saved application messages']
    ]
  }
]

let total = 0
for (const item of replacements) {
  const full = path.join(root, item.file)
  if (!fs.existsSync(full)) continue
  let text = fs.readFileSync(full, 'utf8')
  let changed = 0
  for (const [from, to] of item.pairs) {
    if (text.includes(from)) {
      text = text.split(from).join(to)
      changed++
      total++
    }
  }
  if (changed) {
    fs.writeFileSync(full, text, 'utf8')
    console.log(`Copy polish: ${item.file} (${changed} replacement${changed === 1 ? '' : 's'})`)
  }
}

if (!total) {
  console.log('Copy polish: no exact text replacements were needed. Typography system was still applied.')
} else {
  console.log(`Copy polish complete: ${total} total replacement${total === 1 ? '' : 's'}.`)
}
