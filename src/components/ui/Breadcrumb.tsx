import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/people': 'People',
  '/companies': 'Companies',
  '/pipeline': 'Pipeline',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/inbox': 'Inbox',
  '/files': 'Files',
  '/marketing': 'Marketing',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/logs': 'Activity Log',
  '/payments': 'Payments',
  '/settings': 'Settings',
  '/trash': 'Trash',
  '/collaborators': 'Collaborators',
  '/profile': 'Profile',
  '/search': 'Search',
  '/notifications': 'Notifications',
}

export function Breadcrumb() {
  const location = useLocation()
  const path = location.pathname
  const label = routeLabels[path] ?? path.replace('/', '').replace(/-/g, ' ')

  if (path === '/') return null

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-sm text-muted md:flex">
      <Link to="/" className="flex items-center gap-1 hover:text-ink transition-colors">
        <Home size={14} />
      </Link>
      <ChevronRight size={12} className="text-line-strong" />
      <span className="font-medium capitalize text-ink">{label}</span>
    </nav>
  )
}
