import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Banknote, CalendarDays, ChevronRight, FileVideo, MessageCircle, Settings, ShieldAlert, Upload, UserRound, Clock, BadgeCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useMe } from '../../lib/auth'
import { Avatar, Skeleton, Stat, VerifiedBadge } from '../../components/ui'
import { naira } from '../../lib/format'

interface Overview { publishedContent: number; pendingContent: number; purchases: number; pendingBookings: number; completedBookings: number; netEarnings: number; unreadMessages: number; verificationStatus: string }

export function ProviderDashboard() {
  const { me } = useMe()
  const { data, isLoading } = useQuery({ queryKey: ['provider-overview'], queryFn: () => api.get<Overview>('/provider/overview') })
  const verified = data?.verificationStatus === 'VERIFIED'
  const name = me?.displayName ?? me?.username ?? ''

  const links = [
    [UserRound, 'My Profile', '/provider/profile', 0], [Upload, 'Upload Content', '/provider/content/upload', 0], [FileVideo, 'My Content', '/provider/content', 0],
    [MessageCircle, 'Messages', '/provider/messages', data?.unreadMessages ?? 0], [CalendarDays, 'Booking Requests', '/provider/bookings', data?.pendingBookings ?? 0],
    [Banknote, 'Earnings', '/provider/earnings', 0], [Settings, 'Settings', '/provider/settings', 0],
  ] as const

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-4"><Avatar src={me?.avatarUrl} name={name} size={64} />
        <div><p className="flex items-center gap-2 text-xl font-extrabold">{name}{verified && <VerifiedBadge size={18} />}</p><p className="text-sm text-muted">Provider Dashboard</p></div></div>

      {!isLoading && !verified && (
        <Link to="/provider/profile" className="mt-5 flex items-center gap-3 rounded-2xl border border-red/30 bg-red-soft p-4">
          {data?.verificationStatus === 'PENDING' ? <Clock className="shrink-0 text-red" /> : <ShieldAlert className="shrink-0 text-red" />}
          <span className="flex-1 text-sm"><span className="block font-semibold">{data?.verificationStatus === 'PENDING' ? 'Your profile is under review' : data?.verificationStatus === 'REJECTED' ? 'Verification wasn’t approved' : 'Finish your profile to go live'}</span><span className="text-muted">{data?.verificationStatus === 'PENDING' ? 'You’ll be notified when a moderator decides.' : 'Add your photo, bio and consent, then submit for identity & age verification.'}</span></span><ChevronRight size={18} className="text-muted" />
        </Link>
      )}
      {verified && <p className="mt-5 flex items-center gap-2 rounded-2xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok"><BadgeCheck size={16} /> Verified — your profile is live and you can publish content.</p>}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <Stat label="Net earnings" value={naira(data!.netEarnings)} accent hint="After commission" />
            <Stat label="Content sales" value={data!.purchases} />
            <Stat label="Pending requests" value={data!.pendingBookings} />
            <Stat label="Published content" value={data!.publishedContent} />
            <Stat label="In review / draft" value={data!.pendingContent} />
            <Stat label="Completed bookings" value={data!.completedBookings} />
          </>
        )}
      </div>
      {!isLoading && data && data.purchases === 0 && data.publishedContent === 0 && <p className="mt-3 text-center text-xs text-muted">No activity yet — numbers shown here are always real, never placeholders.</p>}

      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {links.map(([I, label, to, badge]) => (
          <Link key={to} to={to} className="flex items-center gap-4 px-4 py-4 transition hover:bg-surface"><I size={20} className="text-muted" /><span className="flex-1 text-[15px] font-medium">{label}</span>{badge > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red px-1.5 text-xs font-bold">{badge}</span>}<ChevronRight size={16} className="text-[#52525b]" /></Link>
        ))}
      </div>
    </div>
  )
}
