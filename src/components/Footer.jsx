import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import ContactModal from './ContactModal'

export default function Footer({ compact = false }) {
  const { t } = useLang()
  const [contactOpen, setContactOpen] = useState(false)

  if (!compact) return null

  const linkStyle = { color: 'var(--text-hint)', textDecoration: 'none', transition: 'color 0.15s' }
  const btnStyle = { background: 'none', border: 'none', color: 'var(--text-hint)', fontSize: 11, padding: 0, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s' }

  return (
    <>
      <footer style={{ marginTop: 48, padding: '24px 0 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 18, fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: 4 }}>Joblytics</div>
            <p style={{ fontSize: 11, color: 'var(--text-hint)', margin: 0, lineHeight: 1.5 }}>
              AI-powered job application tools.<br />
              {t('footer_made_in') || 'Made in France'} · © {new Date().getFullYear()}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 11, alignItems: 'center' }}>
            <a href="/privacy" style={linkStyle}>{t('privacy') || 'Privacy Policy'}</a>
            <a href="/terms" style={linkStyle}>{t('footer_terms') || 'Terms of Service'}</a>
            <a href="/pricing" style={linkStyle}>{t('pricing') || 'Pricing'}</a>
            <a href="/resources" style={linkStyle}>Resources</a>
            <a href="/roles" style={linkStyle}>Role pages</a>
            <a href="/early-access" style={linkStyle}>Early access</a>
            <button onClick={() => setContactOpen(true)} style={btnStyle}>
              {t('footer_contact') || 'Contact'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-hint)', margin: '12px 0 0', paddingTop: 12, borderTop: '1px solid var(--border)', opacity: 0.6 }}>
          Joblytics is an independent tool. ATS scores are indicative only. Job listings belong to their respective owners.
        </p>
      </footer>
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </>
  )
}
