import React from 'react'
import { useLang } from '../context/LangContext'

export default function SmartApplyBtn({ context, jobUrl, verdict }) {
  const { t } = useLang()

  // Show the button whenever we have a link to the job — even if the AI job_context
  // came back empty (e.g. a deterministic-only / fallback analysis). The analyzed
  // job URL is the reliable source; apply_url is only an optional enrichment.
  const applyUrl = context?.apply_url || jobUrl
  const isPassed = verdict === 'likely_passed'
  const isBorderline = verdict === 'borderline'
  if (!applyUrl) return null

  const btnColor = isPassed ? '#4caf7d' : isBorderline ? 'var(--accent)' : 'var(--bg-input)'
  const txtColor = isPassed || isBorderline ? '#1A1B22' : 'var(--text-secondary)'
  const label = isPassed
    ? (t('apply_now') || 'Apply now →')
    : isBorderline
    ? (t('apply_anyway') || 'Apply anyway →')
    : (t('view_job') || 'View job')

  return (
    <div style={{ marginBottom: 10 }}>
      <a href={applyUrl} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '14px', borderRadius: 14,
        background: btnColor, color: txtColor,
        fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
        textDecoration: 'none', border: isPassed||isBorderline ? 'none' : '1px solid var(--border)',
        transition: 'opacity 0.2s'
      }}>
        {label}
      </a>
      {!isPassed && !isBorderline && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
          {t('apply_score_warning') || 'Score is low — improve your CV first using the CV Coach tab'}
        </p>
      )}
    </div>
  )
}
