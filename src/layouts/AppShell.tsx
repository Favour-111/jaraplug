import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { ChevronDown, Coins, LogOut, MapPin, MoreHorizontal, ShieldCheck, Settings as SettingsIcon, UserRound } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, Logo, Modal } from '../components/ui'
import { NotificationBell } from '../components/Bell'
import { useAuthState, useMe } from '../lib/auth'

export interface NavItem { to: string; label: string; icon: ReactNode; badge?: number; end?: boolean }

export function AppShell({ nav, mobileNav, moreItems, settingsPath, profilePath, title, banner }: {
  nav: NavItem[]; mobileNav: NavItem[]; moreItems?: NavItem[]; settingsPath: string; profilePath?: string; title?: string; banner?: ReactNode
}) {
  const { me } = useMe()
  const { signOut } = useAuthState()
  const qc = useQueryClient()
  const nav2 = useNavigate()
  const loc = useLocation()
  const [menu, setMenu] = useState(false)
  const [more, setMore] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setMore(false); setMenu(false) }, [loc.pathname])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const doSignOut = async () => { await signOut(); qc.clear(); nav2('/') }
  const isChat = /\/messages\/[^/]+$/.test(loc.pathname)
  const name = me?.displayName ?? me?.username ?? 'Account'

  return (
    <div className="min-h-screen md:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="px-2"><Logo size="md" to={null} /></div>
        {title && <p className="mt-1 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted">{title}</p>}
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-red-soft text-red' : 'text-muted hover:bg-card hover:text-white'}`}>
              {n.icon}<span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-red px-1.5 py-0.5 text-[10px] font-bold text-white">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
          <Avatar src={me?.avatarUrl} name={name} size={38} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-[11px] text-muted">@{me?.username}</p></div>
          <button onClick={doSignOut} className="rounded-lg p-2 text-muted hover:bg-bg hover:text-white" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>

      {/* Header */}
      <header className={`sticky top-0 z-20 border-b border-line/70 bg-bg/90 backdrop-blur ${isChat ? 'hidden md:block' : ''}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="md:hidden"><Logo size="sm" to={null} /></div>
          <div className="hidden items-center gap-2 text-sm text-muted md:flex">{me?.role !== 'ADMIN' && <><MapPin size={15} className="text-red" />{me?.city ?? 'Nigeria'}</>}</div>
          <div className="flex items-center gap-2.5">
            {me?.role === 'CLIENT' && <Link to="/app/credits" className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold hover:border-red/60" aria-label={`${me.creditBalance} credits. Buy more`}><Coins size={14} className="text-amber-400" />{me.creditBalance}</Link>}
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-1" aria-label="Account menu"><Avatar src={me?.avatarUrl} name={name} size={40} /><ChevronDown size={14} className="hidden text-muted sm:block" /></button>
              {menu && (
                <div className="absolute right-0 top-12 z-40 w-56 animate-pop overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-card">
                  <div className="border-b border-line px-4 py-2.5"><p className="truncate text-sm font-semibold">{name}</p><p className="text-[11px] text-muted capitalize">{me?.role?.toLowerCase()}</p>{me?.role !== 'ADMIN' && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><MapPin size={11} className="text-red" />{me?.city ?? 'Nigeria'}</p>}</div>
                  {profilePath && <Link to={profilePath} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-card"><UserRound size={15} />Profile</Link>}
                  <Link to={settingsPath} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-card"><SettingsIcon size={15} />Settings</Link>
                  <Link to="/community-guidelines" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-card"><ShieldCheck size={15} />Safety & guidelines</Link>
                  <button onClick={doSignOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red hover:bg-card"><LogOut size={15} />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-6xl px-4 ${isChat ? 'pb-0 md:pb-10' : 'pb-28 md:pb-12'} pt-5`}>{banner}<Outlet /></main>

      {/* Mobile bottom navigation */}
      <nav className={`pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[#0c0c0c]/95 backdrop-blur md:hidden ${isChat ? 'hidden' : ''}`} aria-label="Main">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${mobileNav.length + (moreItems ? 1 : 0)}, minmax(0,1fr))` }}>
          {mobileNav.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => `relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${isActive ? 'text-red' : 'text-muted'}`}>
                <span className="relative">{n.icon}{!!n.badge && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[9px] font-bold text-white">{n.badge}</span>}</span>
                {n.label}
              </NavLink>
            </li>
          ))}
          {moreItems && (
            <li><button onClick={() => setMore(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted"><MoreHorizontal size={22} />More</button></li>
          )}
        </ul>
      </nav>
      {moreItems && (
        <Modal open={more} onClose={() => setMore(false)} title="More">
          <div className="grid gap-1.5">
            {moreItems.map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3.5 text-sm font-medium">{n.icon}<span className="flex-1">{n.label}</span>{!!n.badge && <span className="rounded-full bg-red px-1.5 py-0.5 text-[10px] font-bold">{n.badge}</span>}</Link>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
