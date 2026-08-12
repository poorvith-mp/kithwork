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
      className="fixed bottom-0 right-0 left-0 z-50 grid border-t border-line bg-surface/95 px-2 py-1.5 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
      style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
    >
      {primary.map(({ label, href, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          end={href === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.65rem] font-bold transition-colors ${
              isActive ? 'text-accent' : 'text-muted hover:text-ink'
            }`
          }
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
      <NavLink
        to="/more"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.65rem] font-bold transition-colors ${
            isActive ? 'text-accent' : 'text-muted hover:text-ink'
          }`
        }
      >
        <Ellipsis size={18} />
        <span>More</span>
      </NavLink>
    </nav>
  )
}
