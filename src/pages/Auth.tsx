import { lazy, Suspense } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Crown, Headphones, ShieldCheck, UserRound } from 'lucide-react'
import { SUPPORT_EMAIL } from '../lib/format'
import { api, errMsg } from '../lib/api'
import { queryClient, roleHome, USING_CLERK, useAuthState, useMe } from '../lib/auth'
import { Skeleton, Spinner } from '../components/ui'
import { useToast } from '../lib/toast'
import { FullPageSpinner } from '../lib/guards'
import { useSeo } from '../lib/seo'

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
    <div className="w-full">
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
  useSeo({ title: mode === 'register' ? 'Create an account | JaraPlug' : 'Log in | JaraPlug', noindex: true })
  const nav = useNavigate()
  if (status === 'signedIn' && me) return <Navigate to={me.onboarded ? roleHome(me.role) : '/onboarding'} replace />
  const goBack = () => (window.history.length > 1 ? nav(-1) : nav('/'))
  const circle = 'grid h-11 w-11 place-items-center rounded-full bg-card text-white/90 transition hover:bg-[#222] hover:text-white'
  return (
    <div className="flex min-h-screen justify-center px-4 py-6 sm:py-8">
      <div className="flex w-full max-w-[400px] flex-col">
        <div className="flex items-center justify-between">
          <button type="button" onClick={goBack} aria-label="Go back" className={circle}><ArrowLeft size={18} /></button>
          <a href={`mailto:${SUPPORT_EMAIL}`} aria-label="Contact support" title="Contact support" className={circle}><Headphones size={18} /></a>
        </div>

        <div className="mt-10 sm:mt-14">
          <Link to="/" aria-label="JaraPlug home" className="inline-block"><img src="/logo-mark.png" alt="JaraPlug" className="h-12 w-12 rounded-[22%] shadow-glow" /></Link>
        </div>

        {!USING_CLERK && (
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">{mode === 'register' ? 'Create your account' : 'Log in to your account'}</h1>
            <p className="mt-1.5 text-base text-muted">{mode === 'register' ? 'Join JaraPlug in a few seconds.' : 'Enter your details and pick up where you left off.'}</p>
          </div>
        )}

        <div className="mt-6 w-full">
          {USING_CLERK
            ? <Suspense fallback={<div className="grid place-items-center py-16"><Spinner className="text-red" /></div>}><ClerkForms mode={mode} /></Suspense>
            : <DevLogin mode={mode} />}
        </div>

        <p className="mt-auto pt-10 text-center text-xs text-muted">For adults only (18+) · <Link className="underline hover:text-white" to="/terms">Terms</Link> · <Link className="underline hover:text-white" to="/privacy">Privacy</Link></p>
      </div>
    </div>
  )
}

/** Post-login router: sends the user where their account type belongs. */
export function GoHome() {
  const { me, isLoading } = useMe()
  if (isLoading || !me) return <FullPageSpinner />
  return <Navigate to={me.onboarded ? roleHome(me.role) : '/onboarding'} replace />
}
