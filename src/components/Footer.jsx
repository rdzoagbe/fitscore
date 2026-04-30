import React, { useState } from 'react'
import { useLang } from '../context/LangContext'
import ContactModal from './ContactModal'

export default function Footer({ compact = false }) {
  const { t } = useLang()
  const [contactOpen, setContactOpen] = useState(false)

  if (!compact) return null

  return (
    <>
      <footer style={{ marginTop: 40, padding: '20px 0 0', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <p style={{ fontSize: 11, color: 'var(--text-hint)' }}>
          © {new Date().getFullYear()} FitScore · {t('footer_made_in') || 'Made in France'}
        </p>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, alignItems: 'center' }}>
          <a href="/privacy" style={{ color: 'var(--text-hint)', textDecoration: 'none' }}>{t('privacy')}</a>
          <a href="/terms" style={{ color: 'var(--text-hint)', textDecoration: 'none' }}>{t('footer_terms') || 'Terms'}</a>
          <button onClick={() => setContactOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-hint)', textDecoration: 'none', fontSize: 11, padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('footer_contact') || 'Contact'}
          </button>
        </div>
      </footer>
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </>
  )
}
