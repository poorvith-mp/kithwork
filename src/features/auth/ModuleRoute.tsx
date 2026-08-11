import { Navigate, Outlet } from 'react-router-dom'

import { canAccessModule, type ModuleKey } from '@/lib/permissions'
import { useAuth } from './AuthProvider'

export function ModuleRoute({ module }: { module: ModuleKey }) {
  const { access } = useAuth()
  if (!access || !canAccessModule(access, module)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
