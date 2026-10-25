import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Camera, Search } from 'lucide-react'
import { roleHome, useAuthState, useMe } from '../lib/auth'
import { Logo } from '../components/ui'

export const INTENT_KEY = 'jp_intent'

/**
 * TEMPORARY front page (replaces the marketing landing page, which is kept in pages/Landing.tsx).
 * Guests pick "client" (browse with limited access) or "provider" (create an account to list a profile).
 */
export function Welcome() {
  const nav = useNavigate()
  const { status } = useAuthState()
  const { me } = useMe()
  if (status === 'signedIn' && me) return <Navigate to={me.onboarded ? roleHome(me.role) : '/onboarding'} replace />

  const asClient = () => { try { sessionStorage.removeItem(INTENT_KEY) } catch { /* */ } nav('/discover') }
  const asProvider = () => { try { sessionStorage.setItem(INTENT_KEY, 'PROVIDER') } catch { /* */ } nav('/register') }

  return (
    <div className="glow-top flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo size="lg" to={null} />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Find your Jara</p>
      <p className="mt-6 inline-block rounded-lg border border-red/40 bg-red-soft px-3 py-1.5 text-xs font-semibold text-red">18+ · Adults only</p>

      <h1 className="mt-8 text-center text-3xl font-extrabold tracking-tight">How would you like to continue?</h1>
      <div className="mt-8 grid w-full max-w-md gap-3">
        <button onClick={asClient} className="card flex items-center gap-4 p-5 text-left transition hover:border-red/60">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-soft text-red"><Search size={22} /></span>
          <span className="min-w-0 flex-1"><span className="block sm:text-lg text-[15px]font-semibold">I’m Here to Catch Cruise 🔥</span><span className="mt-0.5 block text-sm text-muted">Explore profiles, slide into DMs, book your vibe, and unlock exclusive content.</span></span>
          <ArrowRight size={18} className="shrink-0 text-muted" />
        </button>
        <button onClick={asProvider} className="card flex items-center gap-4 p-5 text-left transition hover:border-red/60">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-soft text-red"><Camera size={22} /></span>
          <span className="min-w-0 flex-1"><span className="block sm:text-lg text-[15px] font-semibold">I’m Here to Get Plugged In 💜</span><span className="mt-0.5 block text-sm text-muted">Set up your profile, drop your content, attract clients, and run your own show.</span></span>
          <ArrowRight size={18} className="shrink-0 text-muted" />
        </button>
      </div>
      <p className="mt-8 text-sm text-muted">Already have an account? <Link to="/login" className="font-semibold text-white underline">Log in</Link></p>
      <p className="mt-6 text-xs text-muted"><Link className="underline hover:text-white" to="/terms">Terms</Link> · <Link className="underline hover:text-white" to="/privacy">Privacy</Link> · <Link className="underline hover:text-white" to="/community-guidelines">Guidelines</Link></p>
    </div>
  )
}
