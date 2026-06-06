import React from 'react'
import { useLang } from '../context/LangContext'
import './AppShellBar.css'

export default function AppShellBar({ setPage }) {
  const { t } = useLang()
  const goTo = page => { setPage?.(page); window.scrollTo(0, 0) }
  return (
    <footer className="appShellFooter" aria-label="Global app footer">
      <div className="appShellFooter-inner">
        <span>© {new Date().getFullYear()} Joblytics · {t('app_footer_made')}</span>
        <span className="appShellFooter-links">
          <button type="button" className="appShellFooter-navBtn" onClick={() => goTo('messages')}>{t('nav_messages', 'Messages')}</button>
          <button type="button" className="appShellFooter-navBtn" onClick={() => goTo('sync-settings')}>{t('nav_sync', 'Smart Sync')}</button>
          <a href="/privacy">{t('app_footer_privacy')}</a>
          <a href="/terms">{t('app_footer_terms')}</a>
          <a href="/legal">{t('legal_notice', 'Legal notice')}</a>
          <button type="button" className="appShellFooter-navBtn" onClick={() => goTo('contact')}>{t('app_footer_contact')}</button>
        </span>
      </div>
    </footer>
  )
}