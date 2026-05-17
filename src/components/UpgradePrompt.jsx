import React from 'react'
import { useLang } from '../context/LangContext'
import './UpgradePrompt.css'

export default function UpgradePrompt({ title, body, onUpgrade, compact = false }) {
  const { t } = useLang()
  return (
    <section className={`upgradePrompt ${compact ? 'upgradePrompt--compact' : ''}`}>
      <div className="upgradePrompt-icon">⚡</div>
      <div className="upgradePrompt-content">
        <p>{t('upgrade_kicker', 'Upgrade required')}</p>
        <h3>{title || t('upgrade_title', 'You reached your free plan limit')}</h3>
        <span>{body || t('upgrade_body', 'Upgrade to Starter or Pro to keep analyzing jobs, rebuilding CVs and optimizing your profile.')}</span>
      </div>
      <button type="button" onClick={onUpgrade}>{t('upgrade_cta', 'View plans')}</button>
    </section>
  )
}
