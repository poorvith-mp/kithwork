import { LockKeyhole, LogOut, PanelLeft, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { sourceRepositoryUrl } from '@/lib/productLinks'
import { useSidebar } from './AppShell'
import { visibleNavigation } from './navigation'
import { Badge } from '@/components/ui/Badge'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function Sidebar() {
  const { access, profile, signOut } = useAuth()
  const { collapsed, toggle } = useSidebar()
  const groups = access ? visibleNavigation(access) : []
  const displayName = profile?.fullName ?? 'Workspace account'

  return (
    <aside
      className="sticky top-0 hidden h-screen flex-col bg-sidebar text-sidebar-text transition-[width] duration-200 ease-linear md:flex"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-4 pb-2">
        {!collapsed ? (
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-mark.svg" alt="" className="size-9" />
            <span className="text-lg font-extrabold tracking-tight text-white">Kithwork</span>
          </Link>
        ) : (
          <Link to="/" className="mx-auto">
            <img src="/logo-mark.svg" alt="" className="size-8" />
          </Link>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggle}
        className="mx-3 mb-1 flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sidebar-text/60 transition-colors hover:bg-sidebar-accent hover:text-white"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <PanelLeft size={16} />
        {!collapsed ? <span className="flex-1 text-xs font-bold">Collapse</span> : null}
      </button>

      {/* Navigation */}
      <nav
        className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-2"
        aria-label="Main navigation"
      >
        {groups.map((group) => (
          <section key={group.label}>
            {!collapsed ? (
              <h2 className="mb-1.5 px-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-sidebar-muted">
                {group.label}
              </h2>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ label, href, icon: Icon, locked, badge }) => (
                <NavLink
                  key={href}
                  to={href}
                  end={href === '/'}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg font-semibold transition-colors ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-2.5 py-2'
                    } text-[0.88rem] ${
                      isActive
                        ? 'bg-sidebar-active text-white shadow-[inset_3px_0_#26c38b]'
                        : 'text-sidebar-text hover:bg-sidebar-accent hover:text-white'
                    } ${locked ? 'opacity-60' : ''}`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed ? (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {locked ? <LockKeyhole size={13} className="text-sidebar-muted" /> : null}
                      {badge === 'new' ? <Badge dot variant="success" /> : null}
                      {badge === 'dot' ? <Badge dot /> : null}
                      {typeof badge === 'number' ? (
                        <span className="rounded-md bg-sidebar-accent px-1.5 py-px text-[0.65rem] font-bold">
                          {badge}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-white/10 p-2">

        <Link
          to="/profile"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-accent/20 text-xs font-extrabold text-white">
            {profile ? initials(profile.fullName) : <UserRound size={16} />}
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs text-white">{displayName}</strong>
              <small className="block truncate text-[0.68rem] text-sidebar-text">
                {profile?.roleTitle || (access?.isOwner ? 'Owner' : 'Collaborator')}
              </small>
            </span>
          ) : null}
        </Link>

        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-sidebar-text transition-colors hover:bg-sidebar-accent hover:text-white"
          type="button"
          onClick={() => void signOut()}
        >
          <LogOut size={15} />
          {!collapsed ? <span>Sign out</span> : null}
        </button>
      </div>
    </aside>
  )
}
