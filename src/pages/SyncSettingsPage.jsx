import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './SyncSettingsPage.css'

async function getFreshAccessToken(session) {
  if (session?.access_token) return session.access_token
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

function formatDate(value) {
  if (!value) return 'Never'
  try { return new Date(value).toLocaleString() } catch { return String(value) }
}

const DEFAULT_STATUS = {
  connected: false,
  provider: 'Not connected',
  providerEmail: '',
  emailSync: false,
  calendarSync: false,
  lastSyncAt: null,
  lastError: '',
  health: 'Preview mode',
  scopes: ''
}

export default function SyncSettingsPage({ setPage }) {
  const { session } = useAuth()
  const [status, setStatus] = useState(DEFAULT_STATUS)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error('Please sign in first.')
      const res = await fetch('/api/sync-settings', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not load sync settings (${res.status})`)
      setStatus({ ...DEFAULT_STATUS, ...data })
    } catch (e) {
      setStatus(DEFAULT_STATUS)
      setError(e.message || 'Could not load sync settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStatus() }, [])

  const connectProvider = async provider => {
    setActionLoading(provider)
    setNotice('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error('Please sign in first.')
      const res = await fetch('/api/mail-sync-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not start ${provider} connection (${res.status})`)
      if (!data?.url) throw new Error('Provider did not return a connection URL.')
      window.location.href = data.url
    } catch (e) {
      setError(e.message || 'Could not start provider connection.')
    } finally {
      setActionLoading('')
    }
  }

  const disconnect = async () => {
    setActionLoading('disconnect')
    setNotice('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error('Please sign in first.')
      const res = await fetch('/api/sync-settings', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not disconnect sync (${res.status})`)
      setStatus(DEFAULT_STATUS)
      setNotice('Smart Sync provider disconnected. Stored provider tokens were removed.')
    } catch (e) {
      setError(e.message || 'Could not disconnect sync.')
    } finally {
      setActionLoading('')
    }
  }

  const runTestSync = async () => {
    setActionLoading('test')
    setNotice('')
    setError('')
    try {
      const token = await getFreshAccessToken(session)
      if (!token) throw new Error('Please sign in first.')
      const res = await fetch('/api/smart-job-sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Test sync failed (${res.status})`)
      setNotice(`Test sync complete: ${data.scanned || 0} signals scanned, ${data.eventsStored || 0} events saved.`)
      await loadStatus()
    } catch (e) {
      setError(e.message || 'Test sync failed.')
    } finally {
      setActionLoading('')
    }
  }

  const healthClass = status.connected ? (status.lastError ? 'warning' : 'ready') : 'preview'

  return (
    <div className="syncSettingsPage">
      <main className="syncSettingsShell">
        <section className="syncSettingsHero">
          <div>
            <p>Smart Sync</p>
            <h1>Sync settings</h1>
            <span>Manage how Joblytics reads job-related emails and calendar events from your connected account.</span>
          </div>
          <button type="button" onClick={() => setPage?.('messages')}>Back to Smart Tracking</button>
        </section>

        {notice && <p className="syncSettingsNotice">✓ {notice}</p>}
        {error && <p className="syncSettingsError">⚠ {error}</p>}

        <section className="syncSettingsGrid">
          <article className="syncSettingsCard connectionCard">
            <div className="syncSettingsCardHead">
              <span className={`healthDot ${healthClass}`} />
              <div><p>Connection status</p><h2>{loading ? 'Checking...' : status.health}</h2></div>
            </div>

            <div className="syncStatusRows">
              <div><span>Provider</span><strong>{status.provider}</strong></div>
              <div><span>Account</span><strong>{status.providerEmail || 'Not connected'}</strong></div>
              <div><span>Email sync</span><strong>{status.emailSync ? 'Enabled' : 'Not connected'}</strong></div>
              <div><span>Calendar sync</span><strong>{status.calendarSync ? 'Enabled' : 'Not connected'}</strong></div>
              <div><span>Last sync</span><strong>{formatDate(status.lastSyncAt)}</strong></div>
              <div><span>Last error</span><strong>{status.lastError || 'None'}</strong></div>
            </div>

            <div className="syncSettingsActions">
              <button type="button" onClick={() => connectProvider('google')} disabled={Boolean(actionLoading)}>{actionLoading === 'google' ? 'Connecting...' : 'Connect Google'}</button>
              <button type="button" onClick={() => connectProvider('microsoft')} disabled={Boolean(actionLoading)}>{actionLoading === 'microsoft' ? 'Connecting...' : 'Connect Microsoft'}</button>
              <button type="button" className="secondary" onClick={runTestSync} disabled={Boolean(actionLoading) || !status.connected}>{actionLoading === 'test' ? 'Testing...' : 'Run test sync'}</button>
              <button type="button" className="danger" onClick={disconnect} disabled={Boolean(actionLoading) || !status.connected}>{actionLoading === 'disconnect' ? 'Disconnecting...' : 'Disconnect account'}</button>
            </div>
          </article>

          <article className="syncSettingsCard privacyCard">
            <p>Privacy & permissions</p>
            <h2>Read-only by design</h2>
            <ul>
              <li>Joblytics does not send, delete, move or modify your emails or calendar events.</li>
              <li>Smart Sync is designed to process job-search related signals only.</li>
              <li>Provider tokens must remain encrypted at rest and are never exposed in the browser.</li>
              <li>You can disconnect your provider at any time.</li>
            </ul>
          </article>

          <article className="syncSettingsCard technicalCard">
            <p>Technical status</p>
            <h2>Non-sensitive diagnostics</h2>
            <div className="syncStatusRows compact">
              <div><span>Provider row</span><strong>{status.connected ? 'Present' : 'Missing'}</strong></div>
              <div><span>Email scope</span><strong>{status.emailSync ? 'Granted' : 'Missing'}</strong></div>
              <div><span>Calendar scope</span><strong>{status.calendarSync ? 'Granted' : 'Missing'}</strong></div>
              <div><span>Scopes</span><strong>{status.scopes || 'None'}</strong></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
