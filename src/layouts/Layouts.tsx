import { Coins, Gift, Banknote, CalendarDays, Flag, FileVideo, Heart, Home, LayoutDashboard, LockKeyhole, MessageCircle, ReceiptText, ScrollText, Settings, Upload, UserCheck, UserRound, Users, LifeBuoy, BadgeCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell, type NavItem } from './AppShell'
import { useMe } from '../lib/auth'
import { ReferralPopup } from '../components/Referral'

const ic = 21
function AgeBanner() {
  const { me } = useMe()
  if (!me || me.role === 'ADMIN' || me.ageVerificationStatus === 'VERIFIED') return null
  const pending = me.ageVerificationStatus === 'PENDING'
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red/30 bg-red-soft px-4 py-3 text-sm">
      <BadgeCheck className="shrink-0 text-red" size={20} />
      <p className="min-w-0 flex-1 text-white/90">
        {pending ? 'Your age verification is being reviewed. Messaging, bookings and purchases unlock once approved.' : me.ageVerificationStatus === 'REJECTED' ? 'Your last verification was not approved. You can try again.' : 'Verify your age to unlock messaging, bookings and purchases.'}
      </p>
      {!pending && <Link to="/verify" className="btn-primary btn-sm">Verify now</Link>}
    </div>
  )
}

export function ClientLayout() {
  const { me } = useMe()
  const mobile: NavItem[] = [
    { to: '/app/discover', label: 'Home', icon: <Home size={ic} />, end: true },
    { to: '/app/messages', label: 'Messages', icon: <MessageCircle size={ic} />, badge: me?.counts.unreadMessages },
    { to: '/app/bookings', label: 'Bookings', icon: <CalendarDays size={ic} /> },
    { to: '/app/saved', label: 'Saved', icon: <Heart size={ic} /> },
    { to: '/app/profile', label: 'Profile', icon: <UserRound size={ic} /> },
  ]
  const desktop: NavItem[] = [
    ...mobile,
    { to: '/app/credits', label: 'Credits', icon: <Coins size={ic} /> },
    { to: '/app/content', label: 'Unlocked content', icon: <LockKeyhole size={ic} /> },
    { to: '/app/purchases', label: 'Purchases', icon: <ReceiptText size={ic} /> },
    { to: '/app/settings', label: 'Settings', icon: <Settings size={ic} /> },
  ]
  return <><AppShell nav={desktop} mobileNav={mobile} settingsPath="/app/settings" profilePath="/app/profile" banner={<AgeBanner />} /><ReferralPopup /></>
}

export function ProviderLayout() {
  const { me } = useMe()
  const all: NavItem[] = [
    { to: '/provider/dashboard', label: 'Overview', icon: <LayoutDashboard size={ic} /> },
    { to: '/provider/profile', label: 'My Profile', icon: <UserRound size={ic} /> },
    { to: '/provider/content', label: 'My Content', icon: <FileVideo size={ic} />, end: true },
    { to: '/provider/content/upload', label: 'Upload Content', icon: <Upload size={ic} /> },
    { to: '/provider/messages', label: 'Messages', icon: <MessageCircle size={ic} />, badge: me?.counts.unreadMessages },
    { to: '/provider/bookings', label: 'Booking Requests', icon: <CalendarDays size={ic} />, badge: me?.counts.pendingBookings },
    { to: '/provider/earnings', label: 'Earnings', icon: <Banknote size={ic} /> },
    { to: '/provider/settings', label: 'Settings', icon: <Settings size={ic} /> },
  ]
  const mobile: NavItem[] = [
    { to: '/provider/dashboard', label: 'Home', icon: <Home size={ic} /> },
    { to: '/provider/content', label: 'Content', icon: <FileVideo size={ic} />, end: true },
    { to: '/provider/messages', label: 'Messages', icon: <MessageCircle size={ic} />, badge: me?.counts.unreadMessages },
    { to: '/provider/bookings', label: 'Bookings', icon: <CalendarDays size={ic} />, badge: me?.counts.pendingBookings },
  ]
  const more: NavItem[] = all.filter((a) => !mobile.some((m) => m.to === a.to))
  return <AppShell nav={all} mobileNav={mobile} moreItems={more} settingsPath="/provider/settings" profilePath="/provider/profile" title="Provider" />
}

export function AdminLayout() {
  const all: NavItem[] = [
    { to: '/admin', label: 'Overview', icon: <LayoutDashboard size={ic} />, end: true },
    { to: '/admin/users', label: 'Users', icon: <Users size={ic} /> },
    { to: '/admin/verifications', label: 'Verifications', icon: <UserCheck size={ic} /> },
    { to: '/admin/content', label: 'Content', icon: <FileVideo size={ic} /> },
    { to: '/admin/reports', label: 'Reports', icon: <Flag size={ic} /> },
    { to: '/admin/transactions', label: 'Transactions', icon: <ReceiptText size={ic} /> },
    { to: '/admin/support', label: 'Support', icon: <LifeBuoy size={ic} /> },
    { to: '/admin/referrals', label: 'Referrals', icon: <Gift size={ic} /> },
    { to: '/admin/audit', label: 'Audit log', icon: <ScrollText size={ic} /> },
  ]
  const mobile = all.slice(0, 4)
  return <AppShell nav={all} mobileNav={mobile} moreItems={all.slice(4)} settingsPath="/admin" title="Admin" />
}
