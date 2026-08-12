import { Outlet } from 'react-router-dom'

/**
 * ProtectedRoute: In demo / standalone template mode, renders child routes directly.
 * If authentication is enabled, wrap with session / auth checks as detailed in docs/SETUP.md.
 */
export function ProtectedRoute() {
  return <Outlet />
}

export function SignedInRoute() {
  return <Outlet />
}
