import { LockKeyhole, LogOut, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { sourceRepositoryUrl } from '@/lib/productLinks'
import { visibleNavigation } from './navigation'

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
  const groups = access ? visibleNavigation(access) : []
  const displayName = profile?.fullName ?? 'Workspace account'

  return (
    <aside className="sidebar">
      <div className="brand"><img src="/logo-mark.svg" alt=""/><span>Kithwork</span></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map((group) => (
          <section className="nav-group" key={group.label} aria-labelledby={`nav-${group.label}`}>
            <h2 id={`nav-${group.label}`}>{group.label}</h2>
            {group.items.map(({ label, href, icon: Icon, locked }) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`
                }
              >
                <Icon size={18}/><span>{label}</span>
                {locked ? <LockKeyhole size={13} className="nav-lock"/> : null}
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-account">
        <a
          className="account-link"
          href={sourceRepositoryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="View Kithwork source"
        >
          <span className="account-copy">
            <strong>Source</strong>
            <small>AGPL-3.0-or-later</small>
          </span>
        </a>
        <Link to="/profile" className="account-link">
          <span className="account-avatar" aria-hidden="true">
            {profile ? initials(profile.fullName) : <UserRound size={18}/>}
          </span>
          <span className="account-copy">
            <strong>{displayName}</strong>
            <small>{profile?.roleTitle || (access?.isOwner ? 'Owner' : 'Collaborator')}</small>
          </span>
          <span className="sr-only">Open My Profile</span>
        </Link>
        <button className="account-signout" type="button" onClick={() => void signOut()}>
          <LogOut size={17}/><span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
