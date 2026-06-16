import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkedInJobId } from './analyze-accurate.js'

test('linkedInJobId extracts the job id from common LinkedIn URL shapes', () => {
  assert.equal(linkedInJobId('https://www.linkedin.com/jobs/view/4418753634/'), '4418753634')
  assert.equal(linkedInJobId('https://www.linkedin.com/jobs/view/senior-engineer-at-acme-4418753634'), '4418753634')
  assert.equal(linkedInJobId('https://www.linkedin.com/jobs/search/?currentJobId=4418753634'), '4418753634')
  assert.equal(linkedInJobId('https://fr.linkedin.com/jobs/view/4418753634'), '4418753634')
  assert.equal(linkedInJobId('https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4418753634'), '4418753634')
})

test('linkedInJobId returns null for non-LinkedIn or non-job URLs', () => {
  assert.equal(linkedInJobId('https://example.com/jobs/view/4418753634'), null)
  assert.equal(linkedInJobId('https://www.linkedin.com/feed/'), null)
  assert.equal(linkedInJobId(''), null)
  assert.equal(linkedInJobId(null), null)
})
