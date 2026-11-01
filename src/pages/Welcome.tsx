import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Camera, LockKeyhole, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { roleHome, useAuthState, useMe } from '../lib/auth'
import { Logo } from '../components/ui'
import { useSeo } from '../lib/seo'

export const INTENT_KEY = 'jp_intent'

/**
 * TEMPORARY front page (replaces the marketing landing page, which is kept in pages/Landing.tsx).
 * Guests pick "client" (browse with limited access) or "provider" (create an account to list a profile).
 */
export function Welcome() {
  const nav = useNavigate()
  const { status } = useAuthState()
  const { me } = useMe()
  useSeo({
    title: 'JaraPlug | Discover Verified Profiles & Exclusive Content Near You',
    description: 'JaraPlug is an adults-only (18+) platform to discover identity-verified profiles in your city, message privately, request bookings and unlock exclusive content.',
    path: '/',
  })
  if (status === 'signedIn' && me) return <Navigate to={me.onboarded ? roleHome(me.role) : '/onboarding'} replace />

  const asClient = () => { try { sessionStorage.removeItem(INTENT_KEY) } catch { /* */ } nav('/discover') }
  const asProvider = () => { try { sessionStorage.setItem(INTENT_KEY, 'PROVIDER') } catch { /* */ } nav('/register') }

  return (
    <div className="glow-top flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo size="lg" to={null} />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Find your Jara</p>
      <h1 className="mt-6 max-w-md text-center text-base font-medium leading-relaxed text-white/85">Discover verified profiles, chat privately and unlock exclusive content — wherever you are.</h1>
      <p className="mt-5 inline-block rounded-lg border border-red/40 bg-red-soft px-3 py-1.5 text-xs font-semibold text-red">18+ · Adults only</p>

      <h2 className="mt-8 text-center text-3xl font-extrabold tracking-tight">How would you like to continue?</h2>
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

      <section aria-labelledby="about-jaraplug" className="mt-14 w-full max-w-3xl border-t border-line pt-10">
        <h2 id="about-jaraplug" className="text-center text-xl font-bold tracking-tight">What is JaraPlug?</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted">
          JaraPlug is an adults-only profile discovery and exclusive-content platform. Providers run their own profiles; members browse them, message privately, request bookings and unlock exclusive photos and videos with in-app credits.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [ShieldCheck, 'Verified profiles', 'Providers pass an identity and age review before they are listed.'],
            [MessageCircle, 'Private by design', 'Message and book in the app. Legal names, phone numbers and emails are never shown.'],
            [LockKeyhole, 'Exclusive content', 'Unlock paid photos and videos once and keep them in your private library.'],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof ShieldCheck
            return (
              <div key={title as string} className="card p-4">
                <I size={18} className="text-red" />
                <h3 className="mt-2.5 text-sm font-semibold">{title as string}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{text as string}</p>
              </div>
            )
          })}
        </div>
        <p className="mt-6 text-center text-sm"><Link to="/discover" className="font-semibold text-red hover:underline">Browse verified profiles →</Link></p>
      </section>

      <p className="mt-10 text-xs text-muted"><Link className="underline hover:text-white" to="/terms">Terms</Link> · <Link className="underline hover:text-white" to="/privacy">Privacy</Link> · <Link className="underline hover:text-white" to="/community-guidelines">Guidelines</Link></p>
    </div>
  )
}
