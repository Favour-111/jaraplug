import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errMsg } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { Button, Select, Skeleton, Tabs } from '../../components/ui'
import { BookingsPage } from '../Bookings'

interface Win { dayOfWeek: number; startMinute: number; endMinute: number }
const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']] as const
const hours = Array.from({ length: 25 }, (_, i) => i)
const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`

export function ProviderBookingsPage() {
  const [tab, setTab] = useState<'requests' | 'availability'>('requests')
  return (
    <div>
      <Tabs className="mb-5" value={tab} onChange={setTab} tabs={[{ key: 'requests', label: 'Requests' }, { key: 'availability', label: 'My availability' }]} />
      {tab === 'requests' ? <BookingsPage as="provider" /> : <Availability />}
    </div>
  )
}

function Availability() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['availability'], queryFn: () => api.get<{ windows: Win[] }>('/provider/availability') })
  const [rows, setRows] = useState<Record<number, { on: boolean; start: number; end: number }>>({})
  useEffect(() => {
    if (!data) return
    const r: typeof rows = {}
    for (const [d] of DAYS) { const w = data.windows.find((x) => x.dayOfWeek === d); r[d] = w ? { on: true, start: w.startMinute / 60, end: w.endMinute / 60 } : { on: false, start: 10, end: 20 } }
    setRows(r)
  }, [data])
  const save = useMutation({
    mutationFn: () => api.put('/provider/availability', { windows: Object.entries(rows).filter(([, v]) => v.on).map(([d, v]) => ({ dayOfWeek: Number(d), startMinute: v.start * 60, endMinute: v.end * 60 })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['availability'] }); toast('Availability saved', 'success') }, onError: (e) => toast(errMsg(e), 'error'),
  })
  if (isLoading) return <Skeleton className="h-80" />
  const invalid = Object.values(rows).some((r) => r.on && r.end - r.start < 1)
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Weekly availability</h1>
      <p className="mb-4 mt-1 text-sm text-muted">Clients can only request one-hour slots inside these windows (Lagos time). Accepted bookings are removed automatically.</p>
      <div className="card divide-y divide-line">
        {DAYS.map(([d, name]) => { const r = rows[d]; if (!r) return null; return (
          <div key={d} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <label className="flex w-32 items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[#FF1744]" checked={r.on} onChange={(e) => setRows({ ...rows, [d]: { ...r, on: e.target.checked } })} />{name}</label>
            {r.on ? (<div className="flex flex-1 items-center gap-2"><Select aria-label={`${name} start`} className="!py-2" value={r.start} onChange={(e) => setRows({ ...rows, [d]: { ...r, start: +e.target.value } })}>{hours.slice(0, 24).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}</Select><span className="text-muted">to</span><Select aria-label={`${name} end`} className="!py-2" value={r.end} onChange={(e) => setRows({ ...rows, [d]: { ...r, end: +e.target.value } })}>{hours.slice(1).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}</Select></div>) : <span className="text-sm text-muted">Unavailable</span>}
          </div>) })}
      </div>
      {invalid && <p className="mt-2 text-xs text-red">Each window must be at least one hour.</p>}
      <Button className="mt-5 w-full" loading={save.isPending} disabled={invalid} onClick={() => save.mutate()}>Save availability</Button>
    </div>
  )
}
