import {
  Archive,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckSquare2,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  HardDrive,
  Home,
  Inbox,
  LineChart,
  Megaphone,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { canAccessModule, type AccessSnapshot, type ModuleKey } from '@/lib/permissions'

export type NavigationItem = {
  label: string
  href: string
  icon: LucideIcon
  module?: ModuleKey
  locked?: boolean
  badge?: 'new' | 'dot' | number
}

export type NavigationGroup = {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'People', href: '/people', icon: Users, module: 'people' },
      { label: 'Companies', href: '/companies', icon: Building2, module: 'companies' },
      { label: 'Pipeline', href: '/pipeline', icon: BriefcaseBusiness, module: 'pipeline' },
      { label: 'Projects', href: '/projects', icon: FolderKanban, module: 'projects' },
      { label: 'Tasks', href: '/tasks', icon: CheckSquare2, module: 'tasks' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Calendar', href: '/calendar', icon: CalendarDays, module: 'calendar' },
      { label: 'Inbox', href: '/inbox', icon: Inbox, module: 'inbox' },
      { label: 'Files', href: '/files', icon: HardDrive, module: 'files' },
      { label: 'Analytics', href: '/analytics', icon: LineChart, badge: 'new' },
      { label: 'Activity Log', href: '/logs', icon: ClipboardList, badge: 'new' },
    ],
  },
  {
    label: 'Owner',
    items: [
      { label: 'Marketing', href: '/marketing', icon: Megaphone, module: 'marketing' },
      { label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports' },
      {
        label: 'Payments',
        href: '/payments',
        icon: CircleDollarSign,
        module: 'payments',
        locked: true,
      },
      { label: 'Settings', href: '/settings', icon: Settings, module: 'settings' },
      { label: 'Trash', href: '/trash', icon: Archive, module: 'trash' },
      {
        label: 'Collaborators',
        href: '/collaborators',
        icon: UserCog,
        module: 'collaborators',
      },
    ],
  },
]

export function visibleNavigation(access: AccessSnapshot) {
  return navigationGroups.flatMap((group) => {
    const items = group.items.filter(
      (item) => item.module === undefined || canAccessModule(access, item.module),
    )
    return items.length > 0 ? [{ ...group, items }] : []
  })
}
