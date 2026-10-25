import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui'
import { roleHome, useAuthState, useMe } from '../lib/auth'
import { SUPPORT_EMAIL } from '../lib/format'

export function PublicHeader() {
  const { status } = useAuthState()
  const { me } = useMe()
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo size="md" />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <Link to="/discover" className="hover:text-white">Discover</Link>
          {/* The landing-page anchors (How it works / For providers / FAQ) return with the landing page. */}
        </nav>
        <div className="flex items-center gap-2">
          {status === 'signedIn' && me ? (
            <button className="btn-primary btn-sm" onClick={() => nav(roleHome(me.role))}>Open app</button>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn-primary btn-sm">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <Logo size="md" />
            <p className="mt-4 text-sm text-muted">Discover profiles, connect privately and explore exclusive content. Built in Lagos.</p>
            <p className="mt-4 inline-block rounded-lg border border-red/40 bg-red-soft px-3 py-1.5 text-xs font-semibold text-red">18+ · Adults only</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div className="space-y-2.5"><p className="font-semibold">Explore</p><Link className="block text-muted hover:text-white" to="/discover">Discover</Link><Link className="block text-muted hover:text-white" to="/register">Create account</Link><Link className="block text-muted hover:text-white" to="/login">Log in</Link></div>
            <div className="space-y-2.5"><p className="font-semibold">Legal</p><Link className="block text-muted hover:text-white" to="/terms">Terms of Service</Link><Link className="block text-muted hover:text-white" to="/privacy">Privacy Policy</Link><Link className="block text-muted hover:text-white" to="/community-guidelines">Community Guidelines</Link></div>
            <div className="space-y-2.5"><p className="font-semibold">Support</p><Link className="block text-muted hover:text-white" to="/community-guidelines#report">Report content</Link><Link className="block text-muted hover:text-white" to="/community-guidelines#takedown">Takedown requests</Link><a className="block text-muted hover:text-white" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></div>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">© {new Date().getFullYear()} JaraPlug. All rights reserved. JaraPlug is a platform for adults. Users are solely responsible for complying with the law where they live.</p>
      </div>
    </footer>
  )
}

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <Outlet />
      <Footer />
    </div>
  )
}
