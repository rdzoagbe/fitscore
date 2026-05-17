import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { TERMS_VERSION } from '../lib/legal'
import LangSelector from './LangSelector'
import ThemeToggle from './ThemeToggle'
import './TermsGate.css'

export default function TermsGate() {
  const { acceptCurrentTerms, signOut } = useAuth()
  const { t } = useLang()
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canContinue = acceptedTerms && acceptedPrivacy && !loading

  const handleContinue = async () => {
    if (!canContinue) return
    setError('')
    setLoading(true)
    const { error } = await acceptCurrentTerms('terms_gate')
    if (error) setError(error.message || t('legal_accept_error', 'Could not save your legal acceptance. Please try again.'))
    setLoading(false)
  }

  return (
    <div className="termsGate-page">
      <div className="termsGate-topbar">
        <div className="termsGate-logo"><span>J</span><strong>Joblytics</strong></div>
        <div className="termsGate-controls"><LangSelector /><ThemeToggle /></div>
      </div>

      <main className="termsGate-card">
        <p className="termsGate-kicker">{t('legal_gate_kicker', 'Legal acceptance')}</p>
        <h1>{t('legal_gate_title', 'Before accessing your workspace')}</h1>
        <p className="termsGate-intro">{t('legal_gate_intro', 'To keep Joblytics safe, transparent and compliant, please review and accept the current Terms of Service and Privacy Policy before using the app.')}</p>

        <div className="termsGate-version">
          <span>{t('legal_current_version', 'Current legal version')}</span>
          <strong>{TERMS_VERSION}</strong>
        </div>

        <label className="termsGate-check">
          <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} />
          <span>{t('legal_accept_terms_prefix', 'I have read and agree to the')} <a href="/terms" target="_blank" rel="noreferrer">{t('terms_of_use', 'Terms of Use')}</a>.</span>
        </label>

        <label className="termsGate-check">
          <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} />
          <span>{t('legal_accept_privacy_prefix', 'I acknowledge the')} <a href="/privacy" target="_blank" rel="noreferrer">{t('privacy_policy_full', 'Privacy Policy')}</a> {t('legal_privacy_suffix', 'and understand how my data is processed.')}</span>
        </label>

        <div className="termsGate-note">
          <strong>{t('legal_note_title', 'Important')}</strong>
          <p>{t('legal_note_body', 'Joblytics provides AI guidance for job seekers. It does not guarantee interviews, employment, salary outcomes or legal/professional decisions.')}</p>
        </div>

        {error && <p className="termsGate-error">⚠ {error}</p>}

        <button type="button" className="termsGate-primary" disabled={!canContinue} onClick={handleContinue}>
          {loading ? t('please_wait', 'Please wait...') : t('legal_accept_continue', 'Accept and continue')}
        </button>

        <button type="button" className="termsGate-secondary" onClick={signOut}>{t('sign_out', 'Sign out')}</button>
      </main>
    </div>
  )
}
