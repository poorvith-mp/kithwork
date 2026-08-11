import { Ellipsis } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { visibleNavigation } from './navigation'

const primaryLabels = new Set(['Home', 'People', 'Tasks', 'Calendar'])

export function MobileNav() {
  const { access } = useAuth()
  const primary = access
    ? visibleNavigation(access)
      .flatMap((group) => group.items)
      .filter((item) => primaryLabels.has(item.label))
    : []

  return (
    <nav
      className="mobile-nav"
      aria-label="Mobile navigation"
      style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
    >
      {primary.map(({ label, href, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          end={href === '/'}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Icon size={20}/><span>{label}</span>
        </NavLink>
      ))}
      <NavLink to="/more" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
        <Ellipsis size={20}/><span>More</span>
      </NavLink>
    </nav>
  )
}
