import { Bell, Clock3, LogOut, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { canPerform } from '@/lib/permissions'

function formatLocalTime(value: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(value)
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(value)
  }
}

export function Topbar() {
  const [now, setNow] = useState(() => new Date())
  const navigate = useNavigate()
  const { access, profile, signOut } = useAuth()
  const timezone = profile?.timezone ?? 'UTC'

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const localTime = formatLocalTime(now, timezone)
  const canQuickCreatePerson = access
    ? canPerform(access, 'people', 'create')
    : false

  return (
    <header className="topbar">
      <a className="mobile-brand" href="/" aria-label="Kithwork home">
        <img src="/logo-mark.svg" alt=""/>
      </a>
      <div className="search-box">
        <Search size={18}/>
        <input
          className="input"
          placeholder="Search people, projects, tasks, conversations…"
          aria-label="Global search"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              navigate(`/search?q=${encodeURIComponent(event.currentTarget.value)}`)
            }
          }}
        />
      </div>
      <span className="badge"><Clock3 size={14}/>{localTime}</span>
      {canQuickCreatePerson ? (
        <Button onClick={() => navigate('/people?create=1')}>
          <Plus size={17}/><span>Quick create</span>
        </Button>
      ) : null}
      <Button
        variant="secondary"
        iconOnly
        onClick={() => navigate('/notifications')}
        aria-label="Notifications"
      >
        <Bell size={18}/>
      </Button>
      <Button variant="ghost" iconOnly onClick={() => void signOut()} aria-label="Sign out">
        <LogOut size={18}/>
      </Button>
    </header>
  )
}
