import { useCallback, useEffect, useState } from 'react'
import { Laptop, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Badge, Panel } from '@/components/ui/Panel'
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type SessionSummary,
} from '@/lib/accountApi'

function deviceLabel(session: SessionSummary) {
  const userAgent = session.deviceMetadata.userAgent
  if (typeof userAgent !== 'string' || userAgent.length === 0) return 'Unknown device'
  if (/iphone|ipad/i.test(userAgent)) return 'Apple mobile device'
  if (/android/i.test(userAgent)) return 'Android device'
  if (/windows/i.test(userAgent)) return 'Windows browser'
  if (/macintosh|mac os/i.test(userAgent)) return 'Mac browser'
  if (/linux/i.test(userAgent)) return 'Linux browser'
  return 'Web browser'
}

export function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listSessions()
      setSessions((result.sessions ?? []).filter((session) => !session.revokedAt))
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to load active sessions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const revokeOne = async (session: SessionSummary) => {
    if (session.current) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await revokeSession(session.sessionId)
      await refresh()
      setNotice('Session signed out.')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to sign out that session.')
    } finally {
      setBusy(false)
    }
  }

  const revokeOthers = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await revokeOtherSessions()
      await refresh()
      setNotice('Other sessions signed out.')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to sign out other sessions.')
    } finally {
      setBusy(false)
    }
  }

  const otherCount = sessions.filter((session) => !session.current).length

  return (
    <Panel
      title="Active sessions"
      action={
        <Button type="button" variant="secondary" onClick={() => void revokeOthers()} disabled={busy || loading || otherCount === 0}>
          <LogOut size={16}/>Sign out other sessions
        </Button>
      }
    >
      <div className="stack">
      <p className="muted">Review browsers where your Kithwork account is signed in. Device labels are estimated from browser information.</p>
        {error ? <div className="error-box" role="alert">{error}</div> : null}
        {notice ? <div className="notice-box" role="status">{notice}</div> : null}
        {loading ? <div className="empty"><div className="spinner" aria-label="Loading sessions"/></div> : sessions.length > 0 ? (
          <div className="session-list">
            {sessions.map((session) => (
              <div className="session-row" key={session.id}>
                <Laptop size={20}/>
                <span className="grow">
                  <strong>{deviceLabel(session)} {session.current ? <Badge tone="success">Current</Badge> : null}</strong>
                  <small>Last active {new Date(session.lastActiveAt).toLocaleString()}</small>
                </span>
                {!session.current ? (
                  <Button type="button" variant="ghost" onClick={() => void revokeOne(session)} disabled={busy}>Sign out</Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty compact"><Laptop size={30}/><p>No other active sessions were found.</p></div>
        )}
      </div>
    </Panel>
  )
}
