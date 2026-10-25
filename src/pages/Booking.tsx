import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { api, errMsg } from '../lib/api'
import { useToast } from '../lib/toast'
import type { ProviderProfileData } from '../lib/types'
import { Button, EmptyState, Skeleton, Textarea } from '../components/ui'
import { lagosYmd } from '../lib/format'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BookingRequestPage() {
  const { username = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [date, setDate] = useState(lagosYmd(new Date(Date.now() + 86400_000)))
  const [time, setTime] = useState('')
  const [message, setMessage] = useState('')

  const { data: p, isLoading } = useQuery({ queryKey: ['provider', username], queryFn: () => api.get<ProviderProfileData>(`/providers/${username}`) })
  const slots = useQuery({ queryKey: ['slots', username, date], queryFn: () => api.get<{ slots: string[] }>(`/providers/${username}/slots`, { date }) })

  const send = useMutation({
    mutationFn: () => api.post('/bookings', { providerUsername: username, date, time, message: message || undefined }),
    onSuccess: () => { toast('Booking request sent', 'success'); qc.invalidateQueries({ queryKey: ['bookings'] }); nav('/app/bookings') },
    onError: (e: any) => { toast(errMsg(e), 'error'); if (e?.code === 'SLOT_UNAVAILABLE') slots.refetch(); if (e?.code === 'AGE_VERIFICATION_REQUIRED') nav('/verify') },
  })

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const lead = (first.getDay() + 6) % 7
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)] as (number | null)[]
  }, [month])
  const ymd = (d: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const todayYmd = lagosYmd(today)
  const maxYmd = lagosYmd(new Date(Date.now() + 60 * 86400_000))

  if (isLoading) return <div className="mx-auto max-w-lg space-y-3 p-4"><Skeleton className="h-10" /><Skeleton className="h-72" /></div>
  if (!p) return <div className="mx-auto max-w-md p-6"><EmptyState title="Provider not found" /></div>

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-4">
      <div className="mb-5 flex items-center gap-3"><button onClick={() => nav(-1)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-card" aria-label="Back"><ArrowLeft size={20} /></button><h1 className="text-xl font-bold">Request Booking</h1></div>
      <p className="mb-5 text-sm text-muted">with <span className="font-semibold text-white">{p.displayName}</span></p>

      {(
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Select Date</h2>
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between"><p className="font-semibold">{month.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p><div className="flex gap-1"><button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface disabled:opacity-30" aria-label="Previous month" disabled={month <= new Date(today.getFullYear(), today.getMonth(), 1)} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><button aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button></div></div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-muted">{DOW.map((d) => <div key={d} className="py-1">{d}</div>)}</div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                {days.map((d, i) => {
                  if (!d) return <div key={i} />
                  const s = ymd(d); const disabled = s < todayYmd || s > maxYmd; const active = s === date
                  return <button key={i} disabled={disabled} onClick={() => { setDate(s); setTime('') }} className={`mx-auto grid h-10 w-10 place-items-center rounded-full transition ${active ? 'bg-gradient-to-b from-red to-red-dark font-bold shadow-glow' : disabled ? 'text-[#4a4a4f]' : 'hover:bg-surface'}`}>{d}</button>
                })}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Select Time <span className="font-normal text-muted">(Lagos time)</span></h2>
            {slots.isLoading ? <Skeleton className="h-12" /> : slots.data?.slots.length ? (
              <div className="flex flex-wrap gap-2">{slots.data.slots.map((s) => <button key={s} onClick={() => setTime(s)} className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${time === s ? 'border-red bg-gradient-to-b from-red to-red-dark' : 'border-line bg-card hover:border-red/50'}`}>{s}</button>)}</div>
            ) : <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">No times available on this date. Try another day.</p>}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Additional Message <span className="font-normal text-muted">(Optional)</span></h2>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder="Anything else you'd like to share?" />
          </section>

          <p className="flex gap-2 rounded-xl border border-line bg-card p-3 text-xs text-muted"><Info size={15} className="mt-0.5 shrink-0 text-red" />A request is not confirmation or consent to anything. {p.displayName} can accept or decline, and either of you can cancel at any time. No payment is taken.</p>
          <Button className="w-full py-3" disabled={!time} loading={send.isPending} onClick={() => send.mutate()}>Send Request</Button>
        </div>
      )}
    </div>
  )
}
