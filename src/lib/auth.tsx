import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { QueryClient, useQuery } from '@tanstack/react-query'
import { api, ApiError, API_BASE, setTokenGetter } from './api'
import type { AppConfig, Me } from './types'

export const CLERK_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) || ''
export const USING_CLERK = !!CLERK_KEY

export interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn'
  /** Stable id of the signed-in account (null when signed out / still loading). Used to keep per-account local caches apart. */
  userKey: string | null
  signOut: () => Promise<void>
  /** dev mode only */
  devSignIn: (token: string) => void
}
const AuthCtx = createContext<AuthState>({ status: 'loading', userKey: null, signOut: async () => {}, devSignIn: () => {} })
export const useAuthState = () => useContext(AuthCtx)

const ClerkAuth = lazy(() => import('./ClerkAuth'))

const DEV_KEY = 'jp_dev_token'
/** Non-reversible key so the raw dev token never doubles as a storage key. */
function hashString(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
function DevAuth({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => { try { return localStorage.getItem(DEV_KEY) } catch { return null } })
  useEffect(() => { setTokenGetter(async () => token) }, [token])
  setTokenGetter(async () => token) // synchronous so first queries have it
  const value = useMemo<AuthState>(() => ({
    status: token ? 'signedIn' : 'signedOut',
    userKey: token ? `dev-${hashString(token)}` : null,
    signOut: async () => { try { localStorage.removeItem(DEV_KEY) } catch { /* */ } setToken(null) },
    devSignIn: (t) => { try { localStorage.setItem(DEV_KEY, t) } catch { /* */ } setToken(t) },
  }), [token])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!USING_CLERK) return <DevAuth>{children}</DevAuth>
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading…</div>}>
      <ClerkAuth AuthCtx={AuthCtx}>{children}</ClerkAuth>
    </Suspense>
  )
}

export function useMe() {
  const { status } = useAuthState()
  const q = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/me'),
    enabled: status === 'signedIn',
    retry: (n, e) => !(e instanceof ApiError && [401, 403].includes(e.status)) && n < 2,
    staleTime: 15_000,
  })
  return { me: q.data, isLoading: status === 'loading' || (status === 'signedIn' && q.isLoading), error: q.error as ApiError | null, refetch: q.refetch }
}

export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: () => api.get<AppConfig>('/config'), staleTime: Infinity })
}

/** Kobo value of one in-app credit (falls back to ₦100 until the config loads). */
export function useCreditUnit() {
  const { data } = useConfig()
  return data?.creditPriceKobo ?? 10_000
}

export const roleHome = (role: Me['role']) =>
  role === 'PROVIDER' ? '/provider/dashboard' : role === 'ADMIN' ? '/admin' : role === 'CLIENT' ? '/app/discover' : '/onboarding'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 10_000 } },
})
export { API_BASE }
