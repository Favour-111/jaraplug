import { lazy, Suspense } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Crown, ShieldCheck, UserRound } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { queryClient, roleHome, USING_CLERK, useAuthState, useMe } from '../lib/auth'
import { Logo, Skeleton, Spinner } from '../components/ui'
import { useToast } from '../lib/toast'
import { FullPageSpinner } from '../lib/guards'

const ClerkForms = lazy(() => import('../lib/ClerkForms'))

interface DevAccount { username: string; displayName: string; role: string; authProviderId: string }

function DevLogin({ mode }: { mode: 'login' | 'register' }) {
  const { devSignIn } = useAuthState()
  const nav = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['dev-accounts'], queryFn: () => api.get<{ accounts: DevAccount[] }>('/dev/accounts') })

  const signInAs = async (authProviderId: string) => {
    try {
      const { token } = await api.post<{ token: string }>('/dev/login', { authProviderId })
      queryClient.clear(); devSignIn(token); nav('/go')
    } catch (e) { toast(errMsg(e), 'error') }
  }
  const create = async () => {
    try {
      const { token } = await api.post<{ token: string }>('/dev/register', {})
      queryClient.clear(); devSignIn(token); nav('/go')
    } catch (e) { toast(errMsg(e), 'error') }
  }
  const icon = (r: string) => (r === 'ADMIN' ? <Crown size={16} /> : r === 'PROVIDER' ? <ShieldCheck size={16} /> : <UserRound size={16} />)

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
        <strong>Development login.</strong> Passwordless sign-in for seeded demo accounts. Production uses Clerk and refuses to start with this enabled.
      </div>
      <button onClick={create} className="btn-primary mt-4 w-full py-3">{mode === 'register' ? 'Create a new account' : 'Create a new dev account'}</button>
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-muted">Or sign in as a demo account</p>
      <div className="space-y-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        {data?.accounts.map((a) => (
          <button key={a.authProviderId} onClick={() => signInAs(a.authProviderId)} className="card flex w-full items-center gap-3 px-4 py-3 text-left transition hover:border-red/50">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-red-soft text-red">{icon(a.role)}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{a.displayName}</span><span className="block text-xs text-muted">@{a.username} · {a.role.toLowerCase()}</span></span>
          </button>
        ))}
        {data && data.accounts.length === 0 && <p className="text-sm text-muted">No demo accounts found. Run <code className="text-white">npm run db:seed</code>.</p>}
      </div>
    </div>
  )
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { status } = useAuthState()
  const { me } = useMe()
  if (status === 'signedIn' && me) return <Navigate to={me.onboarded ? roleHome(me.role) : '/onboarding'} replace />
  return (
    <div className="glow-top relative flex min-h-screen flex-col items-center px-4 py-10">
      <Logo size="lg" />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Find your Jara</p>
      <div className="mt-10 flex w-full justify-center">
        {USING_CLERK ? <Suspense fallback={<Spinner className="text-red" />}><ClerkForms mode={mode} /></Suspense> : <DevLogin mode={mode} />}
      </div>
      <p className="mt-8 text-xs text-muted">For adults only (18+) · <Link className="underline hover:text-white" to="/terms">Terms</Link> · <Link className="underline hover:text-white" to="/privacy">Privacy</Link></p>
    </div>
  )
}

/** Post-login router: sends the user where their account type belongs. */
export function GoHome() {
  const { me, isLoading } = useMe()
  if (isLoading || !me) return <FullPageSpinner />
  return <Navigate to={me.onboarded ? roleHome(me.role) : '/onboarding'} replace />
}
