import React, { useState, useEffect } from 'react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'

const CONTACT_EMAIL = 'roland.dzoagbe@hotmail.com'

const TOPICS = [
  { value: 'feedback', key: 'contact_topic_feedback' },
  { value: 'bug', key: 'contact_topic_bug' },
  { value: 'feature', key: 'contact_topic_feature' },
  { value: 'partnership', key: 'contact_topic_partnership' },
  { value: 'other', key: 'contact_topic_other' }
]

export default function ContactModal({ onClose }) {
  const { t } = useLang()
  const { user } = useAuth()
  const [topic, setTopic] = useState('feedback')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [onClose])

  const send = () => {
    const subject = `[Joblytics] ${TOPICS.find(t => t.value === topic)?.value || 'Contact'} — from ${name || user?.email || 'a user'}`
    const fromLine = user?.email ? `From: ${user.email}\n` : ''
    const nameLine = name ? `Name: ${name}\n` : ''
    const body = `${nameLine}${fromLine}Topic: ${topic}\n\n${message}`
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  const isValid = message.trim().length >= 10

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 'clamp(24px,5vw,32px)', maxWidth: 460, width: '100%', position: 'relative', animation: 'fadeUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, padding: '4px 8px', lineHeight: 1 }}>×</button>

        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {t('contact_title') || 'Get in touch'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('contact_subtitle') || "We read every message. Tell us what's on your mind."}
          </p>
        </div>

        {!user && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              {t('contact_name') || 'Your name'}
            </label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('contact_name_placeholder') || 'How should we call you?'} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            {t('contact_topic') || 'Topic'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,120px), 1fr))', gap: 6 }}>
            {TOPICS.map(o => (
              <button key={o.value} onClick={() => setTopic(o.value)} style={{
                padding: '8px 10px', borderRadius: 10,
                border: `1px solid ${topic === o.value ? 'var(--accent)' : 'var(--border)'}`,
                background: topic === o.value ? 'var(--accent-bg)' : 'var(--bg-input)',
                color: topic === o.value ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: topic === o.value ? 600 : 400
              }}>
                {t(o.key) || o.value}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            {t('contact_message') || 'Message'}
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('contact_message_placeholder') || "Tell us what's going on..."}
            rows={6}
            maxLength={2000}
          />
          <p style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 4, textAlign: 'right' }}>
            {message.length}/2000
          </p>
        </div>

        <button onClick={send} disabled={!isValid} className="btn-primary" style={{ width: '100%' }}>
          {t('contact_send') || 'Send message →'}
        </button>

        <p style={{ fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          {t('contact_privacy_note') || 'Opens your email app. We respond personally within 48h.'}
        </p>
      </div>
    </div>
  )
}
