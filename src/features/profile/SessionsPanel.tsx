import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Laptop, LogOut, Smartphone } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
  type SessionSummary,
} from '@/lib/accountApi'

function deviceLabel(session: SessionSummary) {
  const userAgent = session.deviceMetadata?.userAgent
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

  useEffect(() => {
    void refresh()
  }, [refresh])

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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void revokeOthers()}
          disabled={busy || loading || otherCount === 0}
        >
          <LogOut size={14} />
          <span>Sign out other sessions</span>
        </Button>
      }
    >
      <div className="space-y-4 text-xs">
        <p className="text-muted">
          Review browsers where your Kithwork account is signed in. Device labels are estimated from
          browser user-agent headers.
        </p>

        {error ? (
          <div
            className="rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-xs text-danger font-medium"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {notice ? (
          <div
            className="rounded-lg border border-[#c8e8d8] bg-accent-soft p-3 text-xs text-accent-strong font-medium flex items-center gap-2"
            role="status"
          >
            <CheckCircle2 size={14} />
            <span>{notice}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isMobile = /iphone|ipad|android/i.test(
                String(session.deviceMetadata?.userAgent || ''),
              )
              return (
                <div
                  className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-line bg-surface-muted/40"
                  key={session.id}
                >
                  {isMobile ? (
                    <Smartphone size={18} className="text-muted shrink-0" />
                  ) : (
                    <Laptop size={18} className="text-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="font-semibold text-ink truncate">
                        {deviceLabel(session)}
                      </strong>
                      {session.current ? (
                        <Badge variant="success">Current</Badge>
                      ) : null}
                    </div>
                    <small className="text-muted text-[0.68rem] block mt-0.5">
                      Last active {new Date(session.lastActiveAt).toLocaleString()}
                    </small>
                  </div>
                  {!session.current ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void revokeOne(session)}
                      disabled={busy}
                    >
                      Sign out
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
            <Laptop size={28} className="mb-2 opacity-50" />
            <p>No other active sessions were found.</p>
          </div>
        )}
      </div>
    </Panel>
  )
}
