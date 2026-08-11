import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function ProtectedRoute() {
  const { session, aal, factors, access, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center-screen"><div className="spinner" aria-label="Loading"/></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  const verified = factors.filter((factor) => factor.status === 'verified')
  if (verified.length < 1) return <Navigate to="/security/setup" replace />
  if (aal !== 'aal2') return <Navigate to="/mfa" replace />
  if (!access || access.accountState !== 'active') return <Navigate to="/login" replace />
  return <Outlet />
}

export function SignedInRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="center-screen"><div className="spinner" aria-label="Loading"/></div>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
