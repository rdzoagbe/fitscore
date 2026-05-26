let currentJob = null

function qs(id) { return document.getElementById(id) }

function truncate(value = '', max = 1200) {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function render(job) {
  currentJob = job
  const preview = qs('preview')
  if (!job || !job.description) {
    preview.innerHTML = '<strong>No job text found</strong><p>Try selecting the job description manually and copying it, or open Joblytics paste mode.</p>'
    return
  }
  preview.innerHTML = `
    <strong>${job.source || 'Current page'}</strong>
    <h2>${job.title || 'Untitled job'}</h2>
    <span>${job.company || 'Company not detected'}${job.location ? ' · ' + job.location : ''}</span>
    <textarea rows="8" id="jobTextPreview"></textarea>
  `
  qs('jobTextPreview').value = [
    job.title ? `Title: ${job.title}` : '',
    job.company ? `Company: ${job.company}` : '',
    job.location ? `Location: ${job.location}` : '',
    job.url ? `URL: ${job.url}` : '',
    '',
    truncate(job.description, 5000)
  ].filter(Boolean).join('\n')
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs[0]
}

async function extract() {
  const tab = await getActiveTab()
  if (!tab?.id) return
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'JOBLYTICS_EXTRACT_JOB' })
    render(response?.job)
  } catch (error) {
    qs('preview').innerHTML = '<strong>Could not read this page</strong><p>Refresh the tab and try again.</p>'
  }
}

function buildText(job) {
  const edited = qs('jobTextPreview')?.value
  if (edited) return edited
  return [
    job?.title ? `Title: ${job.title}` : '',
    job?.company ? `Company: ${job.company}` : '',
    job?.location ? `Location: ${job.location}` : '',
    job?.url ? `URL: ${job.url}` : '',
    '',
    job?.description || ''
  ].filter(Boolean).join('\n')
}

async function getAppUrl() {
  const saved = await chrome.storage.local.get('joblyticsAppUrl')
  return saved.joblyticsAppUrl || 'https://joblytics-ai.vercel.app/analyzer'
}

async function openInJoblytics() {
  const appUrl = await getAppUrl()
  const text = buildText(currentJob)
  const url = new URL(appUrl)
  url.searchParams.set('source', 'clipper')
  if (currentJob?.url) url.searchParams.set('jobUrl', currentJob.url)
  if (currentJob?.title) url.searchParams.set('jobTitle', currentJob.title)
  if (currentJob?.company) url.searchParams.set('company', currentJob.company)
  if (text) url.searchParams.set('jobText', text)
  chrome.tabs.create({ url: url.toString() })
}

async function copyJob() {
  const text = buildText(currentJob)
  await navigator.clipboard.writeText(text)
  qs('copyJob').textContent = 'Copied ✓'
  setTimeout(() => { qs('copyJob').textContent = 'Copy job text' }, 1200)
}

async function saveUrl() {
  const value = qs('appUrl').value.trim()
  if (!value) return
  await chrome.storage.local.set({ joblyticsAppUrl: value })
  qs('saveUrl').textContent = 'Saved ✓'
  setTimeout(() => { qs('saveUrl').textContent = 'Save URL' }, 1200)
}

document.addEventListener('DOMContentLoaded', async () => {
  qs('appUrl').value = await getAppUrl()
  qs('refresh').addEventListener('click', extract)
  qs('copyJob').addEventListener('click', copyJob)
  qs('openJoblytics').addEventListener('click', openInJoblytics)
  qs('saveUrl').addEventListener('click', saveUrl)
  extract()
})
