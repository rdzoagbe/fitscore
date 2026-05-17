import React from 'react'
import { useLang } from '../context/LangContext'
import ThemeToggle from '../components/ThemeToggle'
import LangSelector from '../components/LangSelector'

function NoticeCard({ title, body, placeholder }) {
  return (
    <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22, padding: '20px 22px', boxShadow: '0 18px 45px var(--shadow)' }}>
      <p style={{ margin: '0 0 8px', color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.12em', textTransform: 'uppercase' }}>{title}</p>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{body}</p>
      {placeholder && (
        <div style={{ marginTop: 14, border: '1px dashed var(--border)', borderRadius: 16, padding: '12px 14px', background: 'var(--bg-input)' }}>
          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13, marginBottom: 6 }}>{placeholder}</strong>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
            <li>Legal name / Nom légal</li>
            <li>Business form / Forme juridique</li>
            <li>Registered address / Adresse du siège</li>
            <li>SIREN / SIRET</li>
            <li>VAT status / Statut TVA</li>
            <li>Publication director / Directeur de publication</li>
          </ul>
        </div>
      )}
    </section>
  )
}

export default function LegalNoticePage({ onBack }) {
  const { t } = useLang()

  const cards = [
    { title: t('legal_notice_publisher'), body: t('legal_notice_body'), placeholder: t('legal_notice_placeholder') },
    { title: t('legal_notice_business'), body: t('legal_notice_business_body') },
    { title: t('legal_notice_hosting'), body: t('legal_notice_hosting_body') },
    { title: t('legal_notice_contact'), body: t('legal_notice_contact_body') },
    { title: t('legal_notice_status'), body: t('legal_notice_status_body') }
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '24px 20px 70px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 28 }}>
          <button onClick={onBack || (() => window.history.back())} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: 0 }}>← {t('back', 'Back')}</button>
          <div style={{ display: 'flex', gap: 8 }}><LangSelector /><ThemeToggle /></div>
        </div>

        <header style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 30, padding: 'clamp(24px,5vw,46px)', marginBottom: 22, boxShadow: '0 24px 70px var(--shadow)' }}>
          <p style={{ margin: 0, color: 'var(--accent)', fontSize: 11, fontWeight: 950, letterSpacing: '.14em', textTransform: 'uppercase' }}>Joblytics AI</p>
          <h1 style={{ fontFamily: 'Georgia, Newsreader, serif', fontSize: 'clamp(42px,6vw,72px)', lineHeight: .94, fontWeight: 500, letterSpacing: '-.075em', color: 'var(--text-primary)', margin: '10px 0 14px' }}>{t('legal_notice_title')}</h1>
          <p style={{ maxWidth: 760, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{t('legal_notice_intro')}</p>
        </header>

        <div style={{ display: 'grid', gap: 16 }}>
          {cards.map(card => <NoticeCard key={card.title} {...card} />)}
        </div>
      </div>
    </div>
  )
}
