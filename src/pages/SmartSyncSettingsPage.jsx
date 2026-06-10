import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const cv = n => `var(${n})`

function formatDate(v) {
  if (!v) return 'Never'
  try { return new Date(v).toLocaleString() } catch { return String(v) }
}

async function getFreshToken() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || null
}

function Card({ children }) {
  return (
    <div style={{ background: cv('--bg-card'), border: `1px solid ${cv('--border')}`, borderRadius: 20, padding: '22px 24px' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: cv('--text-secondary') }}>{children}</p>
}

function Stat({ label, value, valueColor }) {
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 11, color: cv('--text-secondary') }}>{label}</p>
      <strong style={{ fontSize: 13, color: valueColor || cv('--text-primary') }}>{value}</strong>
    </div>
  )
}

function TechRow({ label, value, isError }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${cv('--border')}` }}>
      <span style={{ fontSize: 12, color: cv('--text-secondary') }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: isError ? '#ef4444' : cv('--text-primary') }}>{value}</span>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled, primary, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 18px',
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        background: danger ? 'transparent' : primary ? cv('--accent') : cv('--bg-input'),
        color: danger ? '#ef4444' : primary ? '#fff' : cv('--text-primary'),
        border: danger ? '1px solid #ef4444' : primary ? 'none' : `1px solid ${cv('--border')}`,
        transition: 'opacity .15s',
        textAlign: 'left'
      }}
    >{label}</button>
  )
}

export default function SmartSyncSettingsPage({ setPage }) {
  const { user } = useAuth()
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    supabase
      .from('job_sync_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setConnection(data || null))
      .finally(() => setLoading(false))
  }, [user?.id])

  const isConnected = connection?.status === 'connected'
  const provider = connection?.provider || 'google'
  const providerLabel = provider === 'microsoft' ? 'Outlook / Microsoft Calendar' : 'Gmail / Google Calendar'
  const accountEmail = user?.email || user?.user_metadata?.email || '—'
  const healthLabel = isConnected ? 'Ready' : connection ? 'Disconnected' : 'Preview mode'
  const healthColor = isConnected ? '#22c55e' : '#f59e0b'

  const handleConnect = async (p) => {
    setWorking(true); setNotice('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Please sign in again.')
      const res = await fetch('/api/mail-sync-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider: p })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Could not start sync.')
      window.location.href = data.url
    } catch (err) {
      setNotice(err.message || 'Connection failed.')
      setWorking(false)
    }
  }

  const handleRunSync = async () => {
    setWorking(true); setNotice('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Please sign in again.')
      const res = await fetch('/api/smart-job-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({}))
      if (data?.code === 'MAIL_CALENDAR_SYNC_NOT_CONNECTED' || data?.code === 'GOOGLE_SYNC_NOT_CONNECTED') {
        setNotice('No connected account found. Connect Google or Microsoft first.')
        return
      }
      if (!res.ok) throw new Error(data?.error || `Smart Sync failed (${res.status}).`)
      const total = (data.emails?.length || 0) + (data.calendar?.length || 0)
      setNotice(`Sync complete — ${total} signal${total !== 1 ? 's' : ''} detected.`)
    } catch (err) {
      setNotice(err.message || 'Smart Sync could not complete.')
    } finally {
      setWorking(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your account? Joblytics will stop scanning your emails and calendar immediately.')) return
    setWorking(true); setNotice('')
    try {
      const { error } = await supabase
        .from('job_sync_connections')
        .update({ status: 'disconnected' })
        .eq('user_id', user.id)
        .eq('provider', provider)
      if (error) throw error
      setConnection(prev => prev ? { ...prev, status: 'disconnected' } : null)
      setNotice('Account disconnected. Joblytics will no longer scan your emails or calendar.')
    } catch (err) {
      setNotice(err.message || 'Could not disconnect.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => setPage?.('messages')}
          style={{ background: 'none', border: `1px solid ${cv('--border')}`, borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: cv('--text-secondary'), cursor: 'pointer', whiteSpace: 'nowrap', marginTop: 3 }}
        >← Back</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: cv('--text-primary'), letterSpacing: '-.03em' }}>Smart Sync settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: cv('--text-secondary') }}>Manage how Joblytics reads job-related emails and calendar events.</p>
        </div>
      </div>

      {loading && <p style={{ color: cv('--text-secondary'), fontSize: 14, margin: 0 }}>Loading…</p>}

      {!loading && <>
        <Card>
          <SectionLabel>Connection status</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
            <Stat label="Connected provider" value={isConnected ? providerLabel : 'Not connected'} />
            <Stat label="Account" value={accountEmail} />
            <Stat label="Email sync" value={isConnected ? 'Enabled' : 'Not connected'} />
            <Stat label="Calendar sync" value={isConnected ? 'Enabled' : 'Not connected'} />
            <Stat label="Last sync" value={formatDate(connection?.updated_at || connection?.created_at)} />
            <Stat label="Sync health" value={healthLabel} valueColor={healthColor} />
          </div>
        </Card>

        <Card>
          <SectionLabel>Permissions & privacy</SectionLabel>
          <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Read-only access — Joblytics never sends, modifies, or deletes your emails or calendar events.',
              'Only job-search signals are processed: application confirmations, interview invites, rejections, and recruiter messages.',
              'You can disconnect at any time. Scanning stops immediately.',
              'Access tokens are stored securely server-side and never exposed to the browser.'
            ].map((line, i) => (
              <li key={i} style={{ fontSize: 13, color: cv('--text-secondary'), lineHeight: 1.6 }}>{line}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionLabel>Actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!isConnected ? <>
              <ActionBtn label="Connect Google (Gmail + Calendar)" onClick={() => handleConnect('google')} disabled={working} primary />
              <ActionBtn label="Connect Microsoft (Outlook + Calendar)" onClick={() => handleConnect('microsoft')} disabled={working} />
            </> : <>
              <ActionBtn label="Run Smart Sync now" onClick={handleRunSync} disabled={working} primary />
              <ActionBtn label="Disconnect account" onClick={handleDisconnect} disabled={working} danger />
            </>}
          </div>
        </Card>

        <Card>
          <SectionLabel>Technical status</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <TechRow label="Connection record" value={connection ? 'Yes' : 'No'} />
            <TechRow label="Status" value={connection?.status || 'None'} />
            <TechRow label="Provider" value={connection?.provider || '—'} />
            <TechRow label="Email scope" value={connection ? 'Granted' : '—'} />
            <TechRow label="Calendar scope" value={connection ? 'Granted' : '—'} />
            {connection?.error && <TechRow label="Last error" value={connection.error} isError />}
          </div>
        </Card>

        {notice && (
          <p style={{ fontSize: 13, color: cv('--text-primary'), background: cv('--bg-input'), border: `1px solid ${cv('--border')}`, padding: '12px 16px', borderRadius: 10, margin: 0 }}>
            {notice}
          </p>
        )}
      </>}
    </div>
  )
}
