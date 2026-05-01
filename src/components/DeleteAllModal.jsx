import React, { useState, useEffect } from 'react'
import { useLang } from '../context/LangContext'

// Two-step destructive confirmation: user must type DELETE to confirm
export default function DeleteAllModal({ count, onConfirm, onClose }) {
  const { t } = useLang()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [loading, onClose])

  const requiredText = t('delete_confirm_word') || 'DELETE'
  const canDelete = confirmText.trim().toUpperCase() === requiredText.toUpperCase()

  const handleConfirm = async () => {
    if (!canDelete) return
    setLoading(true)
    setError('')
    try {
      await onConfirm()
    } catch (e) {
      setError(e.message || 'Could not delete. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div onClick={() => !loading && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: 20, padding: 'clamp(24px,5vw,32px)', maxWidth: 460, width: '100%', position: 'relative', animation: 'fadeUp 0.3s ease' }}>
        {!loading && (
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, padding: '4px 8px', lineHeight: 1 }}>×</button>
        )}

        <div style={{ marginBottom: 22 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 22 }}>
            ⚠️
          </div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {t('delete_all_title') || 'Delete all saved analyses?'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
            {(t('delete_all_warning') || 'You are about to permanently delete {count} saved analyses. This cannot be undone — your scores, application statuses, and history will all be erased.').replace('{count}', count)}
          </p>
          <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, paddingLeft: 18, marginBottom: 8 }}>
            <li>{t('delete_warns_history') || 'Your full analysis history will be lost'}</li>
            <li>{t('delete_warns_status') || 'Application statuses (Applied, Interview, Offer) will be lost'}</li>
            <li>{t('delete_warns_recovery') || 'There is no way to recover the data'}</li>
          </ul>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            {(t('delete_confirm_prompt') || 'Type {word} to confirm').replace('{word}', requiredText)}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={requiredText}
            disabled={loading}
            autoFocus
            style={{ fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.05em' }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 14, padding: '9px 12px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10 }}>
            ⚠ {error}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete || loading}
            style={{
              padding: '12px', borderRadius: 12,
              background: canDelete && !loading ? '#ff6b6b' : 'var(--bg-input)',
              border: canDelete && !loading ? 'none' : '1px solid var(--border)',
              color: canDelete && !loading ? '#fff' : 'var(--text-muted)',
              fontSize: 14, fontWeight: 700,
              cursor: canDelete && !loading ? 'pointer' : 'not-allowed',
              fontFamily: 'Syne, sans-serif'
            }}
          >
            {loading ? (t('deleting') || 'Deleting...') : `🗑 ${t('delete_all_confirm') || 'Delete all'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
