import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  detectTextLanguage,
  extractSkillTerms,
  estimateYears,
  buildDeterministicAts,
  applyDeterministicAts,
  validateJobTextQuality
} from './ats-deterministic.js'

const EN_DEVOPS_JOB = `We are looking for a Senior DevOps engineer with strong experience in AWS,
Kubernetes, Docker, Terraform, CI/CD pipelines, Python and monitoring. You will manage cloud
infrastructure, ensure security and compliance, and lead incident management. The role requires
strong collaboration with the team. 5 years of experience required.`

const EN_DEVOPS_CV = `Senior DevOps engineer with 7 years of experience. Built CI/CD pipelines,
managed AWS and Kubernetes clusters, Docker containers, Terraform infrastructure as code, Python
automation and monitoring with Prometheus. Led incident management and security compliance reviews.`

const FR_CONSULTING_JOB = `Nous recherchons un Directeur Technology & Strategy pour piloter nos
activites de conseil et de transformation digitale. Vous serez en charge du developpement
commercial, de l avant-vente, du recrutement et de l encadrement des equipes. Une solide
experience en strategie et en gestion de projet est requise. Poste base a Paris.`

test('detectTextLanguage identifies English and French', () => {
  assert.equal(detectTextLanguage(EN_DEVOPS_JOB).code, 'en')
  assert.equal(detectTextLanguage(FR_CONSULTING_JOB).code, 'fr')
})

test('detectTextLanguage returns unknown for too-short text', () => {
  assert.equal(detectTextLanguage('hello world').code, 'unknown')
})

test('extractSkillTerms pulls known tech skills', () => {
  const skills = extractSkillTerms(EN_DEVOPS_JOB)
  for (const expected of ['aws', 'kubernetes', 'docker', 'terraform', 'ci/cd', 'python']) {
    assert.ok(skills.includes(expected), `expected "${expected}" in ${JSON.stringify(skills)}`)
  }
})

test('extractSkillTerms resolves multilingual skills to canonical English labels', () => {
  const skills = extractSkillTerms(FR_CONSULTING_JOB)
  for (const expected of ['digital transformation', 'consulting', 'business development', 'strategy', 'pre-sales']) {
    assert.ok(skills.includes(expected), `expected "${expected}" in ${JSON.stringify(skills)}`)
  }
})

test('extractSkillTerms never emits raw prose fragments as skills', () => {
  const noisy = 'Technology & Strategy — t&s. Beta v. Apply now. Sign in to continue. SSO and API access.'
  const skills = extractSkillTerms(noisy.repeat(3))
  assert.deepEqual(skills.sort(), ['api', 'sso', 'strategy'])
  for (const skill of skills) {
    // every returned skill is a single clean token or a recognized multi-word canonical
    assert.ok(!/\bbeta\b|technology -|-t s/.test(skill), `junk leaked: "${skill}"`)
  }
})

test('estimateYears reads explicit year units across languages', () => {
  assert.equal(estimateYears('we require 5 years of experience'), 5)
  assert.equal(estimateYears('experience de 8 ans minimum'), 8)
  assert.equal(estimateYears('mindestens 6 jahre erfahrung'), 6)
  assert.equal(estimateYears('no numbers here at all'), 0)
})

test('buildDeterministicAts scores a strong same-language match highly', () => {
  const ats = buildDeterministicAts(EN_DEVOPS_JOB, EN_DEVOPS_CV)
  assert.equal(ats.keywordSignalReliable, true)
  assert.ok(ats.displayScore >= 75, `expected >=75, got ${ats.displayScore}`)
  assert.equal(ats.verdict, 'likely_passed')
})

test('buildDeterministicAts matches skills across languages via the lexicon', () => {
  const enCv = `Experienced consultant with a strong track record. You will see that I have led digital
  transformation programs for our clients, driven business development and owned strategy engagements
  with the team. I have strong leadership skills and stakeholder management experience from this role
  and the work that I have done. About 10 years of experience in this field.`
  const ats = buildDeterministicAts(FR_CONSULTING_JOB, enCv)
  assert.equal(ats.languageMismatch, true)
  // cross-language match: French "transformation digitale" <-> English "digital transformation"
  const matched = ats.matchedSkills.map(m => m.required_skill)
  assert.ok(matched.includes('digital transformation'), JSON.stringify(matched))
  assert.ok(matched.includes('strategy'), JSON.stringify(matched))
  // because the lexicon covers the skills, the signal is reliable despite the language gap
  assert.equal(ats.keywordSignalReliable, true)
})

test('buildDeterministicAts flags an unreliable signal when no known skills are found', () => {
  const job = 'We want a passionate person who loves coffee and good vibes and enjoys nice walks outdoors every single day.'
  const cv = 'I enjoy coffee and walking and good vibes and being passionate about life every day.'
  const ats = buildDeterministicAts(job, cv)
  assert.equal(ats.keywordSignalReliable, false)
})

test('applyDeterministicAts defers to AI semantic read when the signal is unreliable', () => {
  const job = 'A role about coffee culture and friendly vibes and pleasant outdoor walks for everyone.'
  const cv = 'I love coffee and walking outdoors and friendly vibes with everyone around me.'
  const ai = { semantic_fit: { score: 70 }, recruiter_shortlist: { probability: 60 } }
  const merged = applyDeterministicAts(ai, job, cv)
  assert.equal(merged.keyword_signal_reliable, false)
  // headline should reflect the AI's read, not a keyword-tanked 0-ish score
  assert.ok(merged.display_score >= 45, `expected deferred score, got ${merged.display_score}`)
})

test('applyDeterministicAts gives clean, helpful gaps and quick wins', () => {
  const enCv = `IT infrastructure manager. Microsoft 365, Active Directory, Intune, ITIL, service desk.
  10 years of experience.`
  const merged = applyDeterministicAts({}, FR_CONSULTING_JOB, enCv)
  // gaps are real canonical skills, never prose fragments
  assert.ok(merged.gaps_to_address.length > 0)
  for (const gap of merged.gaps_to_address) {
    assert.ok(!/ t s|beta| -|technologie/.test(gap), `junk gap: "${gap}"`)
  }
  // quick wins are populated rather than empty
  assert.ok(merged.quick_wins.length > 0)
})

test('validateJobTextQuality blocks an anti-bot / login wall page', () => {
  const result = validateJobTextQuality('Please enable JavaScript and cookies to continue. Sign in to continue.', { source: 'url', url: 'https://www.linkedin.com/jobs/view/123' })
  assert.equal(result.blocked, true)
  assert.equal(result.ok, false)
})

test('validateJobTextQuality accepts a full, real job description', () => {
  const result = validateJobTextQuality(EN_DEVOPS_JOB + ' '.repeat(0) + EN_DEVOPS_JOB, { source: 'paste' })
  assert.equal(result.blocked, false)
})
