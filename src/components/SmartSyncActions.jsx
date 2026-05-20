import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

async function getFreshAccessToken(session) {
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

export default function SmartSyncActions({ onNotice, onError, connected }) {
  const { session } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState('')

  const connectProvider = async provider => {
    setLoadingProvider(provider)
    onNotice?.('')
    onError?.('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error('Please sign in first.')
      const res = await fetch('/api/mail-sync-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not start ${provider} connection.`)
      if (!data?.url) throw new Error('The provider did not return an authorization URL.')
      window.location.href = data.url
    } catch (error) {
      onError?.(error.message || 'Could not start Smart Sync connection.')
    } finally {
      setLoadingProvider('')
    }
  }

  return (
    <div className={`smartSyncActions ${connected ? 'is-connected' : ''}`}>
      <div>
        <strong>{connected ? 'Account connected' : 'Connect Smart Sync'}</strong>
        <span>{connected ? 'Run Smart Sync to refresh your job-related emails and calendar events.' : 'Connect Google or Microsoft to unlock real Gmail, Outlook and calendar results.'}</span>
      </div>
      <div className="smartSyncActionButtons">
        <button type="button" onClick={() => connectProvider('google')} disabled={Boolean(loadingProvider)}>{loadingProvider === 'google' ? 'Connecting...' : 'Connect Google'}</button>
        <button type="button" onClick={() => connectProvider('microsoft')} disabled={Boolean(loadingProvider)}>{loadingProvider === 'microsoft' ? 'Connecting...' : 'Connect Microsoft'}</button>
      </div>
    </div>
  )
}
