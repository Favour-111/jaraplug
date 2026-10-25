import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { roleHome, useAuthState, useMe } from './auth'
import { Spinner } from '../components/ui'
import type { Role } from './types'

export const FullPageSpinner = () => <div className="grid min-h-screen place-items-center text-red"><Spinner className="!h-8 !w-8" /></div>

/** UX guard only — the backend independently enforces every permission. */
export function RequireAuth({ roles, allowUnonboarded }: { roles?: Role[]; allowUnonboarded?: boolean }) {
  const { status } = useAuthState()
  const { me, isLoading, error } = useMe()
  const loc = useLocation()
  if (status === 'loading' || (status === 'signedIn' && isLoading)) return <FullPageSpinner />
  if (status === 'signedOut') return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (error?.status === 403 || error?.status === 401) return <Navigate to="/login" replace />
  if (!me) return <FullPageSpinner />
  if (!me.onboarded && !allowUnonboarded) return <Navigate to="/onboarding" replace />
  if (me.onboarded && allowUnonboarded && loc.pathname === '/onboarding') return <Navigate to={roleHome(me.role)} replace />
  if (roles && !roles.includes(me.role)) return <Navigate to={roleHome(me.role)} replace />
  return <Outlet />
}
