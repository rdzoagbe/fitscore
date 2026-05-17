import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import ContactModal from './ContactModal'

export default function Footer({ compact = false }) {
  const { t } = useLang()
  const [contactOpen, setContactOpen] = useState(false)

  const linkStyle = {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: compact ? 11 : 13,
    fontWeight: 750
  }

  return (
    <>
      <footer
        style={{
          width: 'min(1180px, calc(100% - 32px))',
          margin: compact ? '36px auto 0' : '54px auto 0',
          padding: compact ? '18px 0 26px' : '28px 0 42px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14
        }}
      >
        <p style={{ fontSize: compact ? 11 : 12, color: 'var(--text-secondary)', margin: 0 }}>
          © {new Date().getFullYear()} Joblytics · {t('footer_made_in') || 'Made in France'}
        </p>

        <div style={{ display: 'flex', gap: 16, fontSize: compact ? 11 : 13, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/privacy" style={linkStyle}>{t('privacy') || 'Privacy'}</a>
          <a href="/terms" style={linkStyle}>{t('footer_terms') || 'Terms'}</a>
          <button
            onClick={() => setContactOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: compact ? 11 : 13,
              fontWeight: 750,
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {t('footer_contact') || 'Contact'}
          </button>
        </div>
      </footer>
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </>
  )
}
