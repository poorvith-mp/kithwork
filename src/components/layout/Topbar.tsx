import { Bell, Clock3, LogOut, PanelLeft, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { canPerform } from '@/lib/permissions'
import { useSidebar } from './AppShell'

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
  const { toggle } = useSidebar()
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas/80 px-4 backdrop-blur-md md:px-6">
      {/* Left side: Mobile brand / Sidebar toggle / Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link to="/" className="inline-flex md:hidden" aria-label="Kithwork home">
          <img src="/logo-mark.svg" alt="" className="size-8" />
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="hidden size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-ink md:grid"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <Breadcrumb />
      </div>

      {/* Middle: Search input / Command Palette shortcut */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-14 text-sm placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          placeholder="Search people, projects, tasks…"
          aria-label="Global search"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              navigate(`/search?q=${encodeURIComponent(event.currentTarget.value)}`)
            }
          }}
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-surface-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted">
          ⌘K
        </kbd>
      </div>

      {/* Right side: Clock, Quick create, Notifications, Sign out */}
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-muted lg:inline-flex">
          <Clock3 size={13} />
          {localTime}
        </span>

        {canQuickCreatePerson ? (
          <Button size="sm" onClick={() => navigate('/people?create=1')}>
            <Plus size={16} />
            <span className="hidden sm:inline">Quick create</span>
          </Button>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          iconOnly
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
        >
          <Bell size={16} />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => void signOut()}
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  )
}
