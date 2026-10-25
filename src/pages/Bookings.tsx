import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, Clock, X } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useToast } from '../lib/toast'
import type { Booking } from '../lib/types'
import { Avatar, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton, StatusPill, Tabs, Textarea } from '../components/ui'
import { dateTime } from '../lib/format'

type Tab = 'upcoming' | 'pending' | 'past'

export function BookingsPage({ as }: { as: 'client' | 'provider' }) {
  const [tab, setTab] = useState<Tab>(as === 'provider' ? 'pending' : 'upcoming')
  const [target, setTarget] = useState<{ b: Booking; action: 'CANCELLED' | 'DECLINED' } | null>(null)
  const [reason, setReason] = useState('')
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['bookings'], queryFn: () => api.get<{ items: Booking[] }>('/bookings') })

  const act = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) => api.patch(`/bookings/${id}/status`, { status, reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); qc.invalidateQueries({ queryKey: ['me'] }); setTarget(null); setReason(''); toast('Booking updated', 'success') },
    onError: (e) => toast(errMsg(e), 'error'),
  })

  const all = data?.items ?? []
  const now = Date.now()
  const pending = all.filter((b) => b.status === 'PENDING')
  const upcoming = all.filter((b) => b.status === 'ACCEPTED' && new Date(b.scheduledAt).getTime() >= now - 3600_000)
  const past = all.filter((b) => !pending.includes(b) && !upcoming.includes(b)).reverse()
  const list = tab === 'pending' ? pending : tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <PageHeader title={as === 'provider' ? 'Booking Requests' : 'Bookings'} subtitle={as === 'provider' ? 'Review requests and manage your schedule.' : 'Your requests and upcoming appointments.'} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'upcoming', label: 'Upcoming', badge: upcoming.length || undefined }, { key: 'pending', label: 'Pending', badge: pending.length || undefined }, { key: 'past', label: 'History' }]} />
      <div className="mt-5 space-y-3">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />) : isError ? <ErrorState message={(error as Error).message} onRetry={refetch} /> : list.length === 0 ? (
          <EmptyState icon={<CalendarDays />} title={tab === 'pending' ? 'No pending requests' : tab === 'upcoming' ? 'Nothing scheduled' : 'No booking history'} text={as === 'client' ? 'Find a profile and tap Request Booking.' : 'New requests will appear here.'} action={as === 'client' && <Link to="/app/discover" className="btn-primary btn-sm">Discover profiles</Link>} />
        ) : list.map((b) => (
          <div key={b.id} className="card p-4">
            <div className="flex items-start gap-3">
              <Avatar src={b.other?.avatarUrl} name={b.other?.displayName ?? '?'} size={46} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><p className="truncate font-semibold">{b.other?.displayName}</p><StatusPill status={b.status} /></div>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm"><Clock size={14} className="text-red" />{dateTime(b.scheduledAt)} <span className="text-muted">· {b.durationMins} min</span></p>
                {b.message && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">“{b.message}”</p>}
                {b.declineReason && <p className="mt-2 text-xs text-red">Reason: {b.declineReason}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              {as === 'provider' && b.status === 'PENDING' && (
                <>
                  <button className="btn-primary btn-sm flex-1" disabled={act.isPending} onClick={() => act.mutate({ id: b.id, status: 'ACCEPTED' })}><Check size={14} /> Accept</button>
                  <button className="btn-secondary btn-sm flex-1" onClick={() => setTarget({ b, action: 'DECLINED' })}><X size={14} /> Decline</button>
                </>
              )}
              {as === 'provider' && b.status === 'ACCEPTED' && new Date(b.scheduledAt).getTime() < now && <button className="btn-primary btn-sm" onClick={() => act.mutate({ id: b.id, status: 'COMPLETED' })}>Mark completed</button>}
              {['PENDING', 'ACCEPTED'].includes(b.status) && !(as === 'provider' && b.status === 'PENDING') && <button className="btn-danger btn-sm" onClick={() => setTarget({ b, action: 'CANCELLED' })}>Cancel</button>}
              {b.other?.username && as === 'client' && <Link to={`/profile/${b.other.username}`} className="btn-ghost btn-sm">View profile</Link>}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} danger busy={act.isPending} title={target?.action === 'DECLINED' ? 'Decline this request?' : 'Cancel this booking?'} confirmLabel={target?.action === 'DECLINED' ? 'Decline' : 'Cancel booking'} text="The other person will be notified." onConfirm={() => target && act.mutate({ id: target.b.id, status: target.action, reason: reason || undefined })}>
        <Textarea className="mt-3 !min-h-[70px]" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      </ConfirmDialog>
    </div>
  )
}
