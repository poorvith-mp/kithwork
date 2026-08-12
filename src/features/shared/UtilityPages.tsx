import { Bell, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { visibleNavigation } from '@/components/layout/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { supabase } from '@/lib/supabase'

type Named = {
  id: string
  first_name?: string
  last_name?: string | null
  name?: string
  title?: string
  subject?: string
}

type Notification = {
  id: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
  kind: string
}

export function SearchPage() {
  const [params] = useSearchParams()
  const query = (params.get('q') ?? '').trim().toLowerCase()
  const { data: people } = useRows<Named>('people')
  const { data: companies } = useRows<Named>('companies')
  const { data: projects } = useRows<Named>('projects')
  const { data: tasks } = useRows<Named>('tasks')

  const records = [
    ...people.map((item) => ({
      ...item,
      module: 'People',
      href: '/people',
      label: `${item.first_name} ${item.last_name ?? ''}`,
    })),
    ...companies.map((item) => ({
      ...item,
      module: 'Companies',
      href: '/companies',
      label: item.name ?? '',
    })),
    ...projects.map((item) => ({
      ...item,
      module: 'Projects',
      href: '/projects',
      label: item.title ?? '',
    })),
    ...tasks.map((item) => ({
      ...item,
      module: 'Tasks',
      href: '/tasks',
      label: item.title ?? '',
    })),
  ].filter((item) => query && item.label.toLowerCase().includes(query))

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Private global search"
        title="Search results"
        description="Results are limited to records assigned to your MFA-protected account."
      />

      <Panel>
        {records.length ? (
          <div className="flex flex-col divide-y divide-line">
            {records.map((item) => (
              <Link
                className="flex items-center gap-3 py-3 text-sm transition-colors hover:text-accent"
                to={item.href}
                key={`${item.module}-${item.id}`}
              >
                <Search size={16} className="text-muted" />
                <div className="flex-1">
                  <strong className="block font-semibold text-ink">{item.label}</strong>
                  <small className="text-xs text-muted">{item.module}</small>
                </div>
                <Badge variant="outline">{item.module}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center text-muted">
            <Search size={38} className="mb-2 opacity-40" />
            <h2 className="text-base font-bold text-ink">No matching records</h2>
            <p className="text-sm">Try searching for a person, company, project, or task name.</p>
          </div>
        )}
      </Panel>
    </div>
  )
}

export function NotificationsPage() {
  const { data, refresh } = useRows<Notification>('notifications', 'created_at', false)

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Attention queue"
        title="Notifications"
        description="New enquiries, replies, scheduling decisions, and failed operations."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .is('read_at', null)
              await refresh()
            }}
          >
            Mark all read
          </Button>
        }
      />

      <Panel>
        {data.length ? (
          <div className="flex flex-col divide-y divide-line">
            {data.map((item) => (
              <Link
                className="flex items-start gap-3 py-3.5 text-sm transition-colors hover:bg-surface-muted/50 rounded-lg px-2"
                to={item.href ?? '/'}
                key={item.id}
                onClick={async () => {
                  if (!item.read_at) {
                    await supabase
                      .from('notifications')
                      .update({ read_at: new Date().toISOString() })
                      .eq('id', item.id)
                  }
                }}
              >
                <Bell size={18} className="text-accent mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-semibold text-ink">{item.title}</strong>
                  <small className="block text-xs text-muted">
                    {item.body} · {new Date(item.created_at).toLocaleString('en-IN')}
                  </small>
                </div>
                {!item.read_at && <Badge variant="warning">New</Badge>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center text-muted">
            <Bell size={38} className="mb-2 opacity-40 text-accent" />
            <h2 className="text-base font-bold text-ink">No notifications</h2>
          </div>
        )}
      </Panel>
    </div>
  )
}

export function MorePage() {
  const { access, signOut } = useAuth()
  const primary = new Set(['Home', 'People', 'Tasks', 'Calendar'])
  const items = access
    ? visibleNavigation(access)
        .flatMap((group) => group.items)
        .filter((item) => !primary.has(item.label))
    : []

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Account and navigation"
        title="More"
        description="Quick access to all workspace modules."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 font-bold text-ink shadow-card hover:bg-surface-muted/60 transition-colors"
          to="/profile"
        >
          <strong>My Profile</strong>
        </Link>
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 font-semibold text-ink shadow-card hover:bg-surface-muted/60 transition-colors"
            to={href}
            key={href}
          >
            <Icon size={20} className="text-accent" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">404</h1>
        <p className="mt-2 mb-6 text-sm text-muted">The page you were looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong"
        >
          Return home
        </Link>
      </div>
    </main>
  )
}
