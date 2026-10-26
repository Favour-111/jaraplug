import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronDown, Compass, EyeOff, Flag, Lock, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Wallet, BadgeCheck, UserCheck, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthState, useConfig, useMe } from '../lib/auth'
import type { ProviderCardData } from '../lib/types'
import { ProfileCard, ProfileCardSkeleton } from '../components/ProfileCard'
import { EmptyState, LoadImage } from '../components/ui'
import { pct } from '../lib/format'

const faqs = [
  ['Who can use JaraPlug?', 'JaraPlug is strictly for adults aged 18 and over. Anyone who wants to message, book or unlock content must complete age verification, and providers go through an additional identity and profile review before they are listed.'],
  ['Is my activity private?', 'Yes. Providers never expose a legal name, phone number or personal email. Exclusive media is stored privately and only delivered through short-lived, signed links after we verify your access. You can export or delete your data at any time.'],
  ['How do exclusive items work?', 'Providers can publish public, members-only or paid exclusive photos and videos. Paid items are unlocked with in-app credits, and they stay locked until the credits are deducted on our server — a success page alone never unlocks anything.'],
  ['Can I screen-record paid videos?', 'No web platform can fully stop screen recording. We use private storage, short-lived links and no download buttons to make casual sharing harder, and we act on reports of leaked content.'],
  ['How do I report a problem?', 'Every profile, message and item has a Report option. Reports of non-consensual imagery, underage content, exploitation or impersonation are treated as priority and the content is hidden immediately while we review it.'],
  ['How do credits work?', 'Buy credits once (₦1,000 = 10 credits) and spend them on exclusive content whenever you like — no need to open your bank each time. Credits are used inside JaraPlug only and cannot be withdrawn or converted back to cash.'],
]

export function Landing() {
  const { data } = useQuery({ queryKey: ['providers', 'featured'], queryFn: () => api.get<{ items: ProviderCardData[] }>('/providers', { limit: 8 }) })
  const { data: cfg } = useConfig()
  const [open, setOpen] = useState<number | null>(0)
  const featured = data?.items ?? []
  const { status } = useAuthState()
  const { me } = useMe()
  // A signed-in user who has not finished setting up is sent straight to onboarding instead of seeing the marketing page.
  if (status === 'signedIn' && me && !me.onboarded) return <Navigate to="/onboarding" replace />

  return (
    <div>
      {/* HERO */}
      <section className="glow-top relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-red/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 md:grid-cols-[1.1fr_.9fr] md:pb-24 md:pt-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-muted"><Sparkles size={13} className="text-red" /> Made in Lagos · Find your Jara</p>
            <h1 className="text-[3.4rem] font-extrabold leading-[0.95] tracking-tight sm:text-7xl"><span>Jara</span><span className="text-red">Plug</span></h1>
            <p className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Discover. Connect. Unlock.</p>
            <p className="mt-4 max-w-md text-base text-muted">Your space to discover profiles, connect privately, and explore exclusive content.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/discover" className="btn-primary px-6 py-3">Explore Profiles <ArrowRight size={18} /></Link>
              <Link to="/register" className="btn-secondary px-6 py-3">Create Account</Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted"><ShieldCheck size={14} className="text-red" /> For adults only (18+). Age verification is required to message, book or buy.</p>
          </div>
          {/* hero collage of real featured profiles (or elegant skeletons while loading / empty) */}
          <div className="relative mx-auto hidden h-[480px] w-full max-w-md md:block" aria-hidden>
            {[0, 1, 2].map((i) => {
              const p = featured[i]
              const pos = ['left-0 top-10 -rotate-6 z-10', 'left-1/2 top-0 -translate-x-1/2 z-20', 'right-0 top-16 rotate-6 z-10'][i]
              return (
                <div key={i} className={`absolute w-44 overflow-hidden rounded-2xl border border-line shadow-card ${pos} ${i === 1 ? '!w-52' : ''}`}>
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-[#2a0a12] to-[#0d0305]">
                    {p?.avatarUrl && <LoadImage src={p.avatarUrl} className="h-full w-full object-cover" draggable={false} />}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-10 text-xs font-bold">{p ? `${p.displayName}${p.age ? ' ' + p.age : ''}` : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured profiles</h2><p className="mt-1 text-sm text-muted">Verified, recently active, in your city.</p></div>
          <Link to="/discover" className="hidden text-sm font-medium text-red sm:inline">See all →</Link>
        </div>
        {!data ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <ProfileCardSkeleton key={i} />)}</div>
        ) : featured.length === 0 ? (
          <EmptyState icon={<Compass />} title="Profiles are on their way" text="Verified profiles will appear here as soon as providers are approved." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">{featured.slice(0, 8).map((p) => <ProfileCard key={p.id} p={p} onRequireLogin={() => (window.location.href = '/login')} />)}</div>
        )}
        <Link to="/discover" className="btn-secondary mt-6 w-full sm:hidden">See all profiles</Link>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How JaraPlug works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              [Compass, '1. Discover', 'Browse verified profiles and filter by city and availability.'],
              [MessageCircle, '2. Connect', 'Message privately in real time, or send a booking request for permitted appointment types.'],
              [LockKeyhole, '3. Unlock', 'Buy exclusive photos and videos once. They stay in your private library.'],
            ].map(([Icon, t, d], i) => {
              const I = Icon as typeof Compass
              return (
                <div key={i} className="card p-6 transition hover:border-red/40">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-soft text-red"><I size={22} /></span>
                  <h3 className="mt-5 text-lg font-semibold">{t as string}</h3>
                  <p className="mt-2 text-sm text-muted">{d as string}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* EXCLUSIVE PREVIEW (illustration only) */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Exclusive content, <span className="text-red">locked</span> until you say so</h2>
            <p className="mt-4 text-muted">Previews are blurred on our servers — the real file is never sent to your device until your payment is verified. Short-lived signed links, no permanent public URLs.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Pay once, keep it in your library', 'Secure and discreet checkout', 'Providers set their own prices in naira'].map((t) => (
                <li key={t} className="flex items-center gap-3"><BadgeCheck size={18} className="text-red" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3" aria-label="Illustration of locked content cards">
            {[['Private Video 01', '₦5,000'], ['Private Video 02', '₦10,000']].map(([t, p], i) => (
              <div key={t} className="card overflow-hidden">
                <div className="relative grid aspect-[3/4] place-items-center bg-gradient-to-br from-[#3b0a16] via-[#1a0509] to-[#0b0203]">
                  <div className={`absolute h-40 w-40 rounded-full bg-red/25 blur-3xl ${i ? 'translate-x-8' : '-translate-x-8'}`} />
                  <span className="relative grid h-12 w-12 place-items-center rounded-full bg-black/55 text-amber-400"><Lock size={20} /></span>
                  <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">Illustration</span>
                </div>
                <div className="p-3"><p className="text-sm font-semibold">{t}</p><p className="text-sm font-bold text-red">{p}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVIDERS */}
      <section id="providers" className="border-y border-line bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for providers</h2>
            <p className="mt-4 text-muted">Run your profile like a business — on your terms, with your privacy protected.</p>
            <Link to="/register" className="btn-primary mt-7">Become a provider <ArrowRight size={16} /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [Wallet, 'Keep most of what you earn', cfg ? `Platform commission is ${pct(cfg.commissionBps)}. Every figure comes from verified transactions.` : 'Transparent commission on verified transactions.'],
              [EyeOff, 'You control visibility', 'Choose which profile details are public, or hide your profile entirely.'],
              [BadgeCheck, 'Verified badge', 'Identity and age verified so clients trust who they are talking to.'],
              [UserCheck, 'Simple tools', 'Upload, price, schedule and message from one dashboard — built mobile-first.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Wallet
              return <div key={t as string} className="card p-5"><I size={20} className="text-red" /><p className="mt-3 text-sm font-semibold">{t as string}</p><p className="mt-1.5 text-xs leading-relaxed text-muted">{d as string}</p></div>
            })}
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Privacy & safety first</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, 'Adults only', 'Age assurance for everyone who transacts; identity review for providers.'],
            [LockKeyhole, 'Private media', 'No public file URLs. Signed, short-lived access only after entitlement is checked.'],
            [Flag, 'Report & block', 'One tap to block or report. Serious reports hide content immediately.'],
            [Trash2, 'You own your data', 'Export or permanently delete your account and media whenever you like.'],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Wallet
            return <div key={t as string} className="card p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-soft text-red"><I size={19} /></span><p className="mt-4 font-semibold">{t as string}</p><p className="mt-1.5 text-sm text-muted">{d as string}</p></div>
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {faqs.map(([q, a], i) => (
            <div key={q}>
              <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {q}<ChevronDown size={18} className={`shrink-0 text-muted transition ${open === i ? 'rotate-180 text-red' : ''}`} />
              </button>
              {open === i && <p className="animate-pop px-5 pb-5 text-sm leading-relaxed text-muted">{a}</p>}
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-red/30 bg-gradient-to-br from-red/15 to-transparent p-8 text-center">
          <h3 className="text-2xl font-bold">Ready to find your Jara?</h3>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/discover" className="btn-primary">Explore Profiles</Link><Link to="/register" className="btn-secondary">Create Account</Link></div>
        </div>
      </section>
    </div>
  )
}
