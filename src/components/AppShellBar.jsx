import React from 'react'
import { useLang } from '../context/LangContext'
import './AppShellBar.css'

export default function AppShellBar() {
  const { t } = useLang()
  return (
    <footer className="appShellFooter" aria-label="Global app footer">
      <div className="appShellFooter-inner">
        <span>© {new Date().getFullYear()} Joblytics · {t('app_footer_made')}</span>
        <span className="appShellFooter-links">
          <a href="/messages">{t('nav_messages', 'Messages')}</a>
          <a href="/privacy">{t('app_footer_privacy')}</a>
          <a href="/terms">{t('app_footer_terms')}</a>
          <a href="/legal">{t('legal_notice', 'Legal notice')}</a>
          <a href="/contact">{t('app_footer_contact')}</a>
        </span>
      </div>
    </footer>
  )
}