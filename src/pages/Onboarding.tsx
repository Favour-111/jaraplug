import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Camera, Check, ShieldCheck, UserRound } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { queryClient, useAuthState, useConfig, useMe } from '../lib/auth'
import { Button, Input, Logo, Select } from '../components/ui'
import { useToast } from '../lib/toast'

type Role = 'CLIENT' | 'PROVIDER'
type StepId = 'role' | 'name' | 'username' | 'city' | 'terms'

const USERNAME_RE = /^[a-z0-9_]{3,24}$/
const EXIT_MS = 180

/** One question per slide, Google-account-setup style. */
const STEPS: StepId[] = ['role', 'name', 'username', 'city', 'terms']

function Slide({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  )
}

export function Onboarding() {
  const { data: cfg } = useConfig()
  const { me } = useMe()
  const { signOut } = useAuthState()
  const nav = useNavigate()
  const { toast } = useToast()

  // A guest who chose "I'm a provider" on the front page starts as a provider and skips the role question.
  const intent = (() => { try { return sessionStorage.getItem('jp_intent') } catch { return null } })()
  const [role, setRole] = useState<Role | null>(intent === 'PROVIDER' ? 'PROVIDER' : null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const steps = STEPS
  // Slides run one after the other (old one slides out, then the new one slides in) so two questions are never on screen together.
  const [view, setView] = useState<{ step: StepId; dir: 1 | -1; phase: 'in' | 'out' }>({ step: intent === 'PROVIDER' ? 'name' : 'role', dir: 1, phase: 'in' })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  // Pre-fill from the sign-in provider (e.g. the name on the Google account) without overwriting what the user typed.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !me) return
    prefilled.current = true
    setDisplayName((d) => d || me.displayName || '')
    setCity((c) => c || me.city || '')
  }, [me])
  useEffect(() => { if (!city && cfg?.cities.length) setCity(cfg.cities.includes('Lagos') ? 'Lagos' : cfg.cities[0]) }, [cfg, city])

  const index = steps.indexOf(view.step)
  const goTo = (step: StepId, dir: 1 | -1) => {
    setError('')
    setView((v) => ({ ...v, dir, phase: 'out' }))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setView({ step, dir, phase: 'in' }), EXIT_MS)
  }
  const back = () => view.phase === 'in' && index > 0 && goTo(steps[index - 1], -1)

  const validate = (step: StepId, r: Role | null = role): string => {
    switch (step) {
      case 'name':
        if (r === 'PROVIDER' && displayName.trim().length < 2) return 'Enter the name shown on your profile'
        return displayName.trim() && displayName.trim().length < 2 ? 'Use at least 2 characters' : ''
      case 'username':
        return USERNAME_RE.test(username.trim().toLowerCase()) ? '' : '3–24 characters: letters, numbers, underscores'
      case 'city':
        return city ? '' : 'Choose your city'
      case 'terms':
        return accepted ? '' : 'You must accept to continue'
      default:
        return ''
    }
  }

  const submit = async () => {
    if (!role) return
    setBusy(true)
    try {
      await api.post('/me/onboarding', { role, username: username.trim().toLowerCase(), displayName: displayName.trim() || undefined, city, acceptTerms: true, referralCode: role === 'CLIENT' ? (() => { try { return localStorage.getItem('jp_ref') ?? undefined } catch { return undefined } })() : undefined })
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      try { sessionStorage.removeItem('jp_intent'); localStorage.removeItem('jp_ref') } catch { /* */ }
      toast('Welcome to JaraPlug', 'success')
      nav(role === 'CLIENT' ? '/app/discover' : '/provider/profile')
    } catch (e: any) {
      if (e?.code === 'USERNAME_TAKEN') { goTo('username', -1); setError('That username is taken') }
      else toast(errMsg(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    if (view.phase === 'out') return
    const msg = validate(view.step)
    if (msg) return setError(msg)
    if (view.step === 'terms') return void submit()
    goTo(steps[index + 1], 1)
  }

  const pickRole = (r: Role) => {
    if (view.phase === 'out') return
    setRole(r)
    goTo('name', 1)
  }

  const err = (live: boolean) => live && error && <p role="alert" className="mt-2 text-xs text-red">{error}</p>

  const renderStep = (id: StepId) => {
    const live = id === view.step
    switch (id) {
      case 'role':
        return (
          <Slide title="How will you use JaraPlug?" subtitle="This choice is permanent for this account.">
            <div className="grid gap-3">
              {([['CLIENT', 'I’m Here to Catch Cruise 🔥', 'Explore profiles, slide into DMs, book your vibe, and unlock exclusive content.', UserRound], ['PROVIDER', 'I’m Here to Get Plugged In 💜', 'Set up your profile, drop your content, attract clients, and run your own show.', ShieldCheck]] as const).map(([k, t, d, I]) => (
                <button key={k} type="button" onClick={() => pickRole(k)} className={`card flex items-start gap-4 p-5 text-left transition hover:border-red/60 ${role === k ? 'border-red/60' : ''}`}>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-soft text-red"><I size={22} /></span>
                  <span><span className="block text-lg font-semibold">{t}</span><span className="mt-1 block text-sm text-muted">{d}</span></span>
                </button>
              ))}
            </div>
          </Slide>
        )
      case 'name':
        return (
          <Slide title={role === 'PROVIDER' ? 'What’s your display name?' : 'What should we call you?'} subtitle={role === 'PROVIDER' ? 'Shown on your profile. This is not your legal name.' : 'Shown in chats. You can leave this blank.'}>
            <Input autoFocus={live} aria-label="Display name" placeholder={role === 'PROVIDER' ? 'e.g. Amara' : 'Your name or nickname'} maxLength={40} autoComplete="off" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setError('') }} />
            {err(live)}
          </Slide>
        )
      case 'username':
        return (
          <Slide title="Pick a username" subtitle="Your public handle. Don’t use your real name.">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
              <Input autoFocus={live} aria-label="Username" className="pl-9" placeholder="lagos_nights" maxLength={24} autoComplete="off" autoCapitalize="none" value={username} onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); setError('') }} />
            </div>
            {err(live)}
          </Slide>
        )
      case 'city':
        return (
          <Slide title="Where are you based?" subtitle="We use this to show you people and content nearby.">
            <Select aria-label="City" value={city} onChange={(e) => { setCity(e.target.value); setError('') }}>{cfg?.cities.map((c) => <option key={c}>{c}</option>)}</Select>
            {err(live)}
          </Slide>
        )
      case 'terms':
        return (
          <Slide title="Almost done" subtitle="One last thing before we set up your account.">
            {role === 'PROVIDER' && (
              <div className="mb-5 rounded-xl border border-line bg-card p-4 text-sm text-muted">
                <p className="flex items-center gap-2 font-medium text-white"><Camera size={16} className="text-red" /> Next: photo, bio &amp; verification</p>
                <p className="mt-1.5">You’ll add your photo and biography, confirm you own the rights to your media and that it only shows consenting adults, then submit for identity &amp; age review. Your legal identity is never shown publicly.</p>
              </div>
            )}
            <label className="flex items-start gap-3 text-sm text-muted">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#FF1744]" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setError('') }} />
              <span>I am 18 or older and accept the <Link to="/terms" target="_blank" className="text-white underline">Terms</Link>, <Link to="/privacy" target="_blank" className="text-white underline">Privacy Policy</Link> and <Link to="/community-guidelines" target="_blank" className="text-white underline">Community Guidelines</Link>.</span>
            </label>
            {err(live)}
            <p className="mt-4 text-xs text-muted">Ticking this box confirms your age. Giving false information breaks our Terms and can lead to account removal.</p>
          </Slide>
        )
    }
  }

  const slideIn = view.dir === 1 ? 'animate-enterRight' : 'animate-enterLeft'
  const slideOut = view.dir === 1 ? 'animate-exitLeft' : 'animate-exitRight'

  return (
    <div className="glow-top min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between"><Logo size="md" /><span className="text-xs text-muted">Step {index + 1} of {steps.length}</span></div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
          <div className="h-full rounded-full bg-red transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>

        <form className="mt-8" onSubmit={(e) => { e.preventDefault(); if (view.step !== 'role') next() }}>
          <div className="overflow-x-clip">
            <div key={`${view.step}-${view.phase}`} inert={view.phase === 'out'} className={`motion-reduce:animate-none ${view.phase === 'out' ? slideOut : slideIn}`}>{renderStep(view.step)}</div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            {index > 0 && <button type="button" onClick={back} className="btn-secondary px-3.5 py-3" aria-label="Back"><ArrowLeft size={18} /></button>}
            {view.step !== 'role' && <Button type="submit" className="flex-1 py-3" loading={busy} disabled={view.phase === 'out'}>{view.step === 'terms' ? 'Create my account' : 'Next'}</Button>}
          </div>
          {view.step === 'role' && <button type="button" onClick={() => void signOut()} className="mt-6 text-sm text-muted underline hover:text-white">Use a different account</button>}
        </form>
      </div>
    </div>
  )
}
